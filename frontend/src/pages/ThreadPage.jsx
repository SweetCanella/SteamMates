import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatTime(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/threads/${id}`);
      setThread(res.data);
      if (!silent) setError("");
    } catch (err) {
      if (!silent) setError(err.response?.data?.detail || "Диалог недоступен");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // тихий поллинг — каждые 3 сек дозапрашиваем тред, если вкладка активна
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) load({ silent: true });
    };
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setError("");
    try {
      const res = await api.post(`/threads/${id}/messages`, { text: value });
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.data] } : prev
      );
      setText("");
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // enter — отправка, shift+enter — перенос строки
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && text.trim()) send(e);
    }
  };

  if (loading) return <div className="card"><p className="muted">Загрузка…</p></div>;
  if (!thread)
    return (
      <div className="card">
        <p className="muted">{error || "Диалог не найден"}</p>
        <Link to="/messages" className="btn btn--ghost">Назад к сообщениям</Link>
      </div>
    );

  const counterparty =
    me?.id === thread.author.id ? thread.responder : thread.author;
  const isAuthor = me?.id === thread.author.id;

  return (
    <div className="card chat">
      <div className="card__header">
        <div className="chat__head">
          <Link to={`/users/${counterparty.id}`} className="chat__counterparty">
            <div className="form-card__avatar">
              {counterparty.steam_avatar_url ? (
                <img src={counterparty.steam_avatar_url} alt="" />
              ) : (
                <div className="form-card__avatar-placeholder">
                  {(counterparty.steam_persona_name || counterparty.username || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="chat__persona">
                {counterparty.steam_persona_name || counterparty.username}
              </div>
              <div className="muted chat__login">@{counterparty.username}</div>
            </div>
          </Link>
          <div className="chat__meta muted">
            {isAuthor ? "Отклик на вашу анкету" : "Ваш отклик"} ·{" "}
            <Link to={`/forms/${thread.form_id}`}>{thread.form_game_name}</Link>
          </div>
        </div>
        <Link to="/messages" className="btn btn--ghost">
          Все диалоги
        </Link>
      </div>

      <div className="chat__messages">
        {thread.messages.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div
              key={`${m.id}-${m.created_at}`}
              className={`bubble ${mine ? "bubble--mine" : "bubble--theirs"}`}
            >
              <div className="bubble__text">{m.text}</div>
              <div className="bubble__time">{formatTime(m.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div className="form__error">{error}</div>}

      <form className="chat__form" onSubmit={send}>
        <textarea
          rows={2}
          placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          disabled={sending}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={sending || !text.trim()}
        >
          {sending ? "Отправляем…" : "Отправить"}
        </button>
      </form>
    </div>
  );
}
