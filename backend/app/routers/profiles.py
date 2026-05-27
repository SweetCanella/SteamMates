from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Form, FormStatus, Game, User, UserGameStat
from ..schemas import GameRead, GenreStat, PublicProfile, UserGameStatRead

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


def _to_game_read(game: Game) -> GameRead:
    return GameRead(
        id=game.id,
        steam_app_id=game.steam_app_id,
        name=game.name,
        header_image=game.header_image,
        genres=[g.name for g in game.genres],
    )


@router.get("/{user_id}", response_model=PublicProfile)
def get_public_profile(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PublicProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    stats = (
        db.query(UserGameStat)
        .options(selectinload(UserGameStat.game).selectinload(Game.genres))
        .filter(UserGameStat.user_id == user_id)
        .order_by(UserGameStat.playtime_minutes.desc())
        .all()
    )

    games = [
        UserGameStatRead(
            game=_to_game_read(s.game),
            playtime_minutes=s.playtime_minutes,
            playtime_hours=round(s.playtime_minutes / 60, 1),
        )
        for s in stats
    ]

    # агрегация по жанрам
    agg: dict[str, dict] = {}
    for s in stats:
        hours = s.playtime_minutes / 60
        for g in s.game.genres:
            entry = agg.setdefault(g.name, {"games": 0, "hours": 0.0})
            entry["games"] += 1
            entry["hours"] += hours
    genres = [
        GenreStat(name=name, games_count=v["games"], total_hours=round(v["hours"], 1))
        for name, v in agg.items()
    ]
    genres.sort(key=lambda x: x.total_hours, reverse=True)

    forms_count = (
        db.query(Form)
        .filter(Form.author_id == user_id, Form.status == FormStatus.approved)
        .count()
    )

    return PublicProfile(
        id=user.id,
        username=user.username,
        steam_id=user.steam_id,
        steam_persona_name=user.steam_persona_name,
        steam_avatar_url=user.steam_avatar_url,
        steam_total_playtime_minutes=user.steam_total_playtime_minutes,
        created_at=user.created_at,
        games=games,
        genres=genres,
        forms_count=forms_count,
    )
