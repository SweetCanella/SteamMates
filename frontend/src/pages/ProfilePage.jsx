import { useCallback, useEffect, useState } from "react";

import api from "../api/client.js";
import GenreBars from "../components/GenreBars.jsx";
import GenreRadar from "../components/GenreRadar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [steamInput, setSteamInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState(null);

  const [games, setGames] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadStats = useCallback(async () => {
    if (!user.steam_id) {
      setGames([]);
      setGenres([]);
      return;
    }
    setLoadingStats(true);
    try {
      const [g, gn] = await Promise.all([
        api.get("/steam/me/games"),
        api.get("/steam/me/genres"),
      ]);
      setGames(g.data);
      setGenres(gn.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }, [user.steam_id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!steamInput.trim()) return;
    setLinking(true);
    setError("");
    try {
      const res = await api.post("/steam/link", { steam_input: steamInput.trim() });
      updateUser(res.data);
      setSteamInput("");
      setSyncResult(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось привязать Steam");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Точно отвязать Steam? Импортированная статистика тоже удалится.")) return;
    setError("");
    try {
      const res = await api.delete("/steam/link");
      updateUser(res.data);
      setGames([]);
      setGenres([]);
      setSyncResult(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось отвязать Steam");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSyncResult(null);
    try {
      const res = await api.post("/steam/sync");
      setSyncResult(res.data);
      // подтянем обновлённую аватарку/persona, которая могла обновиться при sync
      try {
        const me = await api.get("/auth/me");
        updateUser(me.data);
      } catch {
        /* ничего страшного, просто не обновим аватар */
      }
      await loadStats();
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось синхронизировать библиотеку");
    } finally {
      setSyncing(false);
    }
  };

  const avatarLetter = (user.steam_persona_name || user.username || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="card profile">
      <div className="profile__header">
        <div className="avatar">
          {user.steam_avatar_url ? (
            <img src={user.steam_avatar_url} alt="" />
          ) : (
            <div className="avatar__placeholder">{avatarLetter}</div>
          )}
        </div>
        <div className="profile__identity">
          <div className="profile__persona">
            {user.steam_persona_name || (
              <span className="muted">Steam-никнейм появится после привязки</span>
            )}
          </div>
          <div className="profile__login">@{user.username}</div>
          {user.steam_id && (
            <a
              href={`https://steamcommunity.com/profiles/${user.steam_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="steam-link"
            >
              Открыть в Steam ↗
            </a>
          )}
          {user.role === "admin" && <span className="badge">admin</span>}
        </div>
      </div>

      <section className="profile__section">
        <h2>Steam-аккаунт</h2>
        {!user.steam_id ? (
          <form className="form steam-form" onSubmit={handleLink}>
            <div className="form__field">
              <label htmlFor="steam-input">SteamID64, ссылка на профиль или vanity-имя</label>
              <input
                id="steam-input"
                type="text"
                placeholder="76561198000000000 или https://steamcommunity.com/id/yourname"
                value={steamInput}
                onChange={(e) => setSteamInput(e.target.value)}
                disabled={linking}
              />
            </div>
            <p className="muted">
              Профиль и список игр должны быть открыты в настройках приватности Steam,
              иначе сервис не сможет получить вашу библиотеку.
            </p>
            <button type="submit" className="btn btn--primary" disabled={linking || !steamInput.trim()}>
              {linking ? "Проверяем…" : "Привязать"}
            </button>
          </form>
        ) : (
          <div className="steam-linked">
            <div>
              SteamID: <code>{user.steam_id}</code>
            </div>
            <div className="muted sync-time">
              {user.steam_last_synced_at
                ? `Последняя синхронизация: ${new Date(user.steam_last_synced_at).toLocaleString("ru-RU")}`
                : "Библиотека ещё не синхронизировалась"}
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? "Синхронизация…" : "Обновить библиотеку"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={handleUnlink}>
                Отвязать
              </button>
            </div>
            <p className="muted">
              В статистику попадают только игры, в которых наиграно от 10 часов.
              Первая синхронизация может занять минуту — сервис тянет жанры из Steam.
            </p>
          </div>
        )}

        {error && <div className="form__error">{error}</div>}

        {syncResult && (
          <div className="sync-result">
            Импортировано игр: <b>{syncResult.imported}</b>. Всего в библиотеке:{" "}
            {syncResult.total_owned}, отфильтровано (меньше {syncResult.threshold_hours} ч):{" "}
            {syncResult.skipped_under_threshold}.
          </div>
        )}
      </section>

      {user.steam_id && (
        <>
          <section className="profile__section">
            <div className="section__head">
              <h2>Любимые жанры</h2>
              {genres.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setShowDetails((v) => !v)}
                >
                  {showDetails ? "Скрыть подробности" : "Подробная статистика"}
                </button>
              )}
            </div>
            {loadingStats ? (
              <p className="muted">Загрузка…</p>
            ) : genres.length === 0 ? (
              <p className="muted">
                Пока нет данных. Нажмите «Обновить библиотеку», чтобы импортировать игры из Steam.
              </p>
            ) : (
              <>
                <GenreRadar genres={genres} />
                {showDetails && (
                  <GenreBars
                    genres={genres}
                    totalPlaytimeMinutes={user.steam_total_playtime_minutes}
                  />
                )}
              </>
            )}
          </section>

          <section className="profile__section">
            <h2>Игры (10+ часов)</h2>
            {loadingStats ? (
              <p className="muted">Загрузка…</p>
            ) : games.length === 0 ? (
              <p className="muted">Пока нет импортированных игр.</p>
            ) : (
              <div className="games-grid">
                {games.map((s) => (
                  <div className="game-card" key={s.game.id}>
                    {s.game.header_image && (
                      <img
                        src={s.game.header_image}
                        alt={s.game.name}
                        className="game-card__img"
                        loading="lazy"
                      />
                    )}
                    <div className="game-card__body">
                      <div className="game-card__title">{s.game.name}</div>
                      <div className="game-card__playtime">{s.playtime_hours} ч</div>
                      {s.game.genres.length > 0 && (
                        <div className="game-card__genres">{s.game.genres.join(", ")}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
