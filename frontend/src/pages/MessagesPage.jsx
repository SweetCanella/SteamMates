import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client.js";

const TABS = [
  { id: "responder", label: "Я откликнулся" },
  { id: "author", label: "Откликнулись на меня" },
];

function formatDate(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("responder");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/threads");
      setThreads(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить отклики");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => threads.filter((t) => t.my_role === tab),
    [threads, tab]
  );

  const counts = useMemo(() => {
    const acc = { responder: 0, author: 0 };
    threads.forEach((t) => {
      acc[t.my_role] = (acc[t.my_role] || 0) + 1;
    });
    return acc;
  }, [threads]);

  return (
    <div className="card">
      <div className="card__header">
        <h1>Отклики</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabs__item ${tab === t.id ? "tabs__item--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} {counts[t.id] > 0 && <span className="muted">({counts[t.id]})</span>}
          </button>
        ))}
      </div>

      {error && <div className="form__error">{error}</div>}

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">
          {tab === "responder" ? (
            <>
              Вы пока ни на кого не откликались.{" "}
              <Link to="/forms">Перейти в ленту</Link>.
            </>
          ) : (
            <>На ваши анкеты пока никто не откликнулся.</>
          )}
        </p>
      ) : (
        <div className="threads">
          {filtered.map((t) => (
            <Link
              key={t.response_id}
              to={`/messages/${t.response_id}`}
              className="thread-item"
            >
              <div className="thread-item__avatar">
                {t.counterparty.steam_avatar_url ? (
                  <img src={t.counterparty.steam_avatar_url} alt="" />
                ) : (
                  <div className="form-card__avatar-placeholder">
                    {(t.counterparty.steam_persona_name || t.counterparty.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div className="thread-item__body">
                <div className="thread-item__top">
                  <div className="thread-item__persona">
                    {t.counterparty.steam_persona_name || t.counterparty.username}
                  </div>
                  <div className="muted thread-item__date">
                    {formatDate(t.started_at)}
                  </div>
                </div>
                <div className="thread-item__sub muted">
                  Анкета: <b>{t.form_game_name}</b>
                </div>
                <div className="thread-item__sub muted">
                  Сообщений в переписке: {t.messages_count}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
