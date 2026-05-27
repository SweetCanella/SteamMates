"""Тонкая обёртка над Steam Web API.

Документация:
    https://steamcommunity.com/dev
    https://wiki.teamfortress.com/wiki/WebAPI
"""

import re
import time

import requests

from .config import settings

STEAM_BASE = "https://api.steampowered.com"
STORE_BASE = "https://store.steampowered.com/api"

_TIMEOUT = 15
_STEAMID64_RE = re.compile(r"^7656119\d{10}$")
_PROFILE_URL_RE = re.compile(r"steamcommunity\.com/profiles/(7656119\d{10})")
_VANITY_URL_RE = re.compile(r"steamcommunity\.com/id/([A-Za-z0-9_-]+)")


class SteamApiError(Exception):
    """Любая ошибка при общении со Steam Web API."""


def _require_key() -> str:
    if not settings.steam_api_key:
        raise SteamApiError("Steam API key не настроен (STEAM_API_KEY в .env)")
    return settings.steam_api_key


def resolve_steam_id(raw: str) -> str:
    """Преобразует пользовательский ввод в SteamID64 (17 цифр).

    Принимает варианты:
        - сам SteamID64 (`76561198...`)
        - ссылку `https://steamcommunity.com/profiles/7656...`
        - ссылку `https://steamcommunity.com/id/<vanity>`
        - просто vanity-имя
    """
    s = raw.strip()
    if not s:
        raise SteamApiError("Пустой Steam-идентификатор")

    if _STEAMID64_RE.match(s):
        return s

    m = _PROFILE_URL_RE.search(s)
    if m:
        return m.group(1)

    m = _VANITY_URL_RE.search(s)
    vanity = m.group(1) if m else s

    key = _require_key()
    try:
        r = requests.get(
            f"{STEAM_BASE}/ISteamUser/ResolveVanityURL/v1/",
            params={"key": key, "vanityurl": vanity},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json().get("response", {})
    except requests.RequestException as e:
        raise SteamApiError(f"Не удалось связаться со Steam: {e}") from e

    if data.get("success") != 1 or not data.get("steamid"):
        raise SteamApiError("Не удалось найти Steam-профиль по введённым данным")
    return data["steamid"]


def get_player_summary(steam_id: str) -> dict | None:
    """Возвращает данные публичного профиля: persona name, аватар и т.д.

    Если профиля нет — отдаёт None.
    """
    key = _require_key()
    try:
        r = requests.get(
            f"{STEAM_BASE}/ISteamUser/GetPlayerSummaries/v2/",
            params={"key": key, "steamids": steam_id},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        players = r.json().get("response", {}).get("players", [])
    except requests.RequestException as e:
        raise SteamApiError(f"Не удалось связаться со Steam: {e}") from e

    return players[0] if players else None


def get_owned_games(steam_id: str) -> list[dict]:
    """Возвращает список игр пользователя из Steam.

    Поля каждого элемента: appid, name, playtime_forever (в минутах), img_icon_url.
    Если профиль закрыт — приходит пустой словарь, кидаем SteamApiError.
    """
    key = _require_key()
    try:
        r = requests.get(
            f"{STEAM_BASE}/IPlayerService/GetOwnedGames/v1/",
            params={
                "key": key,
                "steamid": steam_id,
                "include_appinfo": "true",
                "include_played_free_games": "true",
                "format": "json",
            },
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json().get("response", {})
    except requests.RequestException as e:
        raise SteamApiError(f"Не удалось связаться со Steam: {e}") from e

    if "games" not in data:
        raise SteamApiError(
            "Steam не вернул список игр. "
            "Скорее всего, профиль или список игр закрыт — откройте видимость библиотеки в настройках приватности."
        )
    return data["games"]


def get_app_details(appid: int) -> dict | None:
    """Возвращает блок данных по конкретной игре из магазина Steam.

    Это публичный endpoint storefront, ключ не нужен. Если игра удалена
    или DLC без своей страницы — может вернуться success=false, отдаём None.
    """
    try:
        r = requests.get(
            f"{STORE_BASE}/appdetails",
            params={"appids": str(appid), "l": "english", "cc": "us"},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        payload = r.json() or {}
    except requests.RequestException:
        return None

    entry = payload.get(str(appid))
    if not entry or not entry.get("success"):
        return None
    return entry.get("data")


def fetch_genres_for_apps(appids: list[int], pause_seconds: float = 0.15) -> dict[int, dict]:
    """Тянет appdetails для пачки appid с небольшой паузой между запросами.

    Steam storefront начинает троттлить примерно после 200 запросов за 5 минут с одного IP,
    поэтому если игр много — синхронизация может пройти не полностью. Для курсовой ок.
    """
    result: dict[int, dict] = {}
    for appid in appids:
        info = get_app_details(appid)
        if info is None:
            continue
        genres = [g.get("description", "").strip() for g in info.get("genres", [])]
        genres = [g for g in genres if g]
        result[appid] = {
            "name": info.get("name") or "",
            "header_image": info.get("header_image"),
            "genres": genres,
        }
        time.sleep(pause_seconds)
    return result
