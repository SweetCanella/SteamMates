import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import api from "../api/client.js";
import GenreBars from "../components/GenreBars.jsx";
import GenreRadar from "../components/GenreRadar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/profiles/${id}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || "Не удалось загрузить профиль");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // если это я сам — редирект на /profile, чтобы не дублировать
  if (me && Number(id) === me.id) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) return <div className="card"><p className="muted">Загрузка…</p></div>;
  if (!profile)
    return (
      <div className="card">
        <p className="muted">{error || "Профиль не найден"}</p>
        <Link to="/forms" className="btn btn--ghost">В ленту анкет</Link>
      </div>
    );

  const avatarLetter = (profile.steam_persona_name || profile.username || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="card profile">
      <div className="profile__header">
        <div className="avatar">
          {profile.steam_avatar_url ? (
            <img src={profile.steam_avatar_url} alt="" />
          ) : (
            <div className="avatar__placeholder">{avatarLetter}</div>
          )}
        </div>
        <div className="profile__identity">
          <div className="profile__persona">
            {profile.steam_persona_name || (
              <span className="muted">Steam не привязан</span>
            )}
          </div>
          <div className="profile__login">@{profile.username}</div>
          {profile.steam_id && (
            <a
              href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="steam-link"
            >
              Открыть в Steam ↗
            </a>
          )}
        </div>
      </div>

      <div className="info-grid">
        <div>
          <div className="info-grid__label">На сайте с</div>
          <div>{new Date(profile.created_at).toLocaleDateString("ru-RU")}</div>
        </div>
        <div>
          <div className="info-grid__label">Steam ID</div>
          <div>
            {profile.steam_id ? (
              <code>{profile.steam_id}</code>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="info-grid__label">Анкет опубликовано</div>
          <div>{profile.forms_count}</div>
        </div>
        <div>
          <div className="info-grid__label">Игр (10+ ч)</div>
          <div>{profile.games.length}</div>
        </div>
        <div>
          <div className="info-grid__label">Синхронизация Steam</div>
          <div>
            {profile.steam_last_synced_at
              ? new Date(profile.steam_last_synced_at).toLocaleString("ru-RU")
              : <span className="muted">—</span>}
          </div>
        </div>
      </div>

      <section className="profile__section">
        <div className="section__head">
          <h2>Любимые жанры</h2>
          {profile.genres.length > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Скрыть подробности" : "Подробная статистика"}
            </button>
          )}
        </div>
        {profile.genres.length === 0 ? (
          <p className="muted">
            Нет данных. Пользователь либо не привязал Steam, либо не синхронизировал библиотеку.
          </p>
        ) : (
          <>
            <GenreRadar genres={profile.genres} />
            {showDetails && (
              <GenreBars
                genres={profile.genres}
                totalPlaytimeMinutes={profile.steam_total_playtime_minutes}
              />
            )}
          </>
        )}
      </section>

      <section className="profile__section">
        <h2>Игры (10+ часов)</h2>
        {profile.games.length === 0 ? (
          <p className="muted">Пользователь пока не синхронизировал библиотеку.</p>
        ) : (
          <div className="games-grid">
            {profile.games.map((s) => (
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
    </div>
  );
}
