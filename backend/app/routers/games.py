from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Game, User, UserGameStat
from ..schemas import GameSearchResult

router = APIRouter(prefix="/api/games", tags=["games"])


def _to_search(game: Game, my_app_ids: set[int]) -> GameSearchResult:
    return GameSearchResult(
        id=game.id,
        steam_app_id=game.steam_app_id,
        name=game.name,
        header_image=game.header_image,
        in_my_library=game.steam_app_id in my_app_ids,
    )


@router.get("/my", response_model=list[GameSearchResult])
def my_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GameSearchResult]:
    """Игры из библиотеки текущего пользователя (10+ часов)."""
    stats = (
        db.query(UserGameStat)
        .options(selectinload(UserGameStat.game))
        .filter(UserGameStat.user_id == current_user.id)
        .order_by(UserGameStat.playtime_minutes.desc())
        .all()
    )
    return [
        GameSearchResult(
            id=s.game.id,
            steam_app_id=s.game.steam_app_id,
            name=s.game.name,
            header_image=s.game.header_image,
            in_my_library=True,
        )
        for s in stats
    ]


@router.get("/search", response_model=list[GameSearchResult])
def search_games(
    q: str = Query(default="", max_length=128),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GameSearchResult]:
    """Поиск игр в общей БД по подстроке имени."""
    query = db.query(Game)
    if q.strip():
        query = query.filter(Game.name.ilike(f"%{q.strip()}%"))
    games = query.order_by(Game.name).limit(limit).all()

    my_ids = {
        appid
        for (appid,) in db.query(Game.steam_app_id)
        .join(UserGameStat, UserGameStat.game_id == Game.id)
        .filter(UserGameStat.user_id == current_user.id)
        .all()
    }
    return [_to_search(g, my_ids) for g in games]
