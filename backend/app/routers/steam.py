from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models import Game, Genre, User, UserGameStat
from ..schemas import (
    GameRead,
    GenreStat,
    SteamLinkRequest,
    SteamSyncResult,
    UserGameStatRead,
    UserRead,
)
from ..steam_api import (
    SteamApiError,
    fetch_genres_for_apps,
    get_owned_games,
    get_player_summary,
    resolve_steam_id,
)

router = APIRouter(prefix="/api/steam", tags=["steam"])


def _to_game_read(game: Game) -> GameRead:
    return GameRead(
        id=game.id,
        steam_app_id=game.steam_app_id,
        name=game.name,
        header_image=game.header_image,
        genres=[g.name for g in game.genres],
    )


def _wipe_user_stats(db: Session, user_id: int) -> None:
    db.query(UserGameStat).filter(UserGameStat.user_id == user_id).delete()


def _get_or_create_genre(db: Session, cache: dict[str, Genre], name: str) -> Genre:
    if name in cache:
        return cache[name]
    genre = db.query(Genre).filter(Genre.name == name).first()
    if genre is None:
        genre = Genre(name=name)
        db.add(genre)
        db.flush()
    cache[name] = genre
    return genre


@router.post("/link", response_model=UserRead)
def link_steam(
    payload: SteamLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    try:
        steam_id = resolve_steam_id(payload.steam_input)
    except SteamApiError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    # если меняем привязку — старая статистика больше не актуальна
    if current_user.steam_id and current_user.steam_id != steam_id:
        _wipe_user_stats(db, current_user.id)

    current_user.steam_id = steam_id

    # подтянем сразу персона-нейм и аватарку, чтоб не ждать первой синхронизации
    try:
        summary = get_player_summary(steam_id)
    except SteamApiError:
        summary = None
    if summary:
        current_user.steam_persona_name = summary.get("personaname")
        current_user.steam_avatar_url = (
            summary.get("avatarfull") or summary.get("avatarmedium") or summary.get("avatar")
        )

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/link", response_model=UserRead)
def unlink_steam(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.steam_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Steam-аккаунт не привязан",
        )
    _wipe_user_stats(db, current_user.id)
    current_user.steam_id = None
    current_user.steam_persona_name = None
    current_user.steam_avatar_url = None
    current_user.steam_total_playtime_minutes = None
    current_user.steam_last_synced_at = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/sync", response_model=SteamSyncResult)
def sync_library(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SteamSyncResult:
    if not current_user.steam_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала привяжите Steam-аккаунт",
        )

    # заодно обновим аватарку/ник на случай, если пользователь поменял их в Steam
    try:
        summary = get_player_summary(current_user.steam_id)
    except SteamApiError:
        summary = None
    if summary:
        current_user.steam_persona_name = summary.get("personaname")
        current_user.steam_avatar_url = (
            summary.get("avatarfull") or summary.get("avatarmedium") or summary.get("avatar")
        )

    try:
        owned = get_owned_games(current_user.steam_id)
    except SteamApiError as e:
        # 502 — мы не виноваты, виноват внешний сервис
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    threshold = settings.steam_min_playtime_minutes
    filtered = [g for g in owned if int(g.get("playtime_forever", 0)) >= threshold]
    # сумма по всей библиотеке, включая короткие сессии
    current_user.steam_total_playtime_minutes = sum(
        int(g.get("playtime_forever", 0)) for g in owned
    )

    # подтягиваем игры, которые уже в кэше БД
    appids = [int(g["appid"]) for g in filtered]
    existing = (
        db.query(Game)
        .options(selectinload(Game.genres))
        .filter(Game.steam_app_id.in_(appids))
        .all()
        if appids
        else []
    )
    by_appid: dict[int, Game] = {g.steam_app_id: g for g in existing}

    # для каких appid'ов надо дёрнуть appdetails (новые игры или те, что без жанров)
    need_details = [
        appid for appid in appids if appid not in by_appid or not by_appid[appid].genres
    ]
    details = fetch_genres_for_apps(need_details) if need_details else {}

    genre_cache: dict[str, Genre] = {}

    # обновляем/создаём Game
    for raw in filtered:
        appid = int(raw["appid"])
        name_from_owned = (raw.get("name") or "").strip() or f"App {appid}"
        info = details.get(appid)

        game = by_appid.get(appid)
        if game is None:
            game = Game(
                steam_app_id=appid,
                name=(info["name"] if info and info.get("name") else name_from_owned),
                header_image=(info or {}).get("header_image"),
            )
            db.add(game)
            db.flush()
            by_appid[appid] = game

        if info:
            if info.get("header_image") and not game.header_image:
                game.header_image = info["header_image"]
            if info.get("name") and game.name.startswith("App "):
                game.name = info["name"]
            if info.get("genres") and not game.genres:
                for gname in info["genres"]:
                    game.genres.append(_get_or_create_genre(db, genre_cache, gname))

    # выкидываем старую статистику и пишем свежую
    _wipe_user_stats(db, current_user.id)
    now = datetime.utcnow()
    for raw in filtered:
        appid = int(raw["appid"])
        stat = UserGameStat(
            user_id=current_user.id,
            game_id=by_appid[appid].id,
            playtime_minutes=int(raw.get("playtime_forever", 0)),
            imported_at=now,
        )
        db.add(stat)

    current_user.steam_last_synced_at = now
    db.commit()

    return SteamSyncResult(
        imported=len(filtered),
        skipped_under_threshold=len(owned) - len(filtered),
        total_owned=len(owned),
        threshold_hours=threshold // 60,
    )


@router.get("/me/games", response_model=list[UserGameStatRead])
def my_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserGameStatRead]:
    stats = (
        db.query(UserGameStat)
        .options(selectinload(UserGameStat.game).selectinload(Game.genres))
        .filter(UserGameStat.user_id == current_user.id)
        .order_by(UserGameStat.playtime_minutes.desc())
        .all()
    )
    return [
        UserGameStatRead(
            game=_to_game_read(s.game),
            playtime_minutes=s.playtime_minutes,
            playtime_hours=round(s.playtime_minutes / 60, 1),
        )
        for s in stats
    ]


@router.get("/me/genres", response_model=list[GenreStat])
def my_genres(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GenreStat]:
    stats = (
        db.query(UserGameStat)
        .options(selectinload(UserGameStat.game).selectinload(Game.genres))
        .filter(UserGameStat.user_id == current_user.id)
        .all()
    )

    agg: dict[str, dict] = {}
    for s in stats:
        hours = s.playtime_minutes / 60
        for g in s.game.genres:
            entry = agg.setdefault(g.name, {"games": 0, "hours": 0.0})
            entry["games"] += 1
            entry["hours"] += hours

    result = [
        GenreStat(name=name, games_count=v["games"], total_hours=round(v["hours"], 1))
        for name, v in agg.items()
    ]
    # сортируем по сумме часов, чтобы топ-жанры были сверху
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result
