import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../api/client.js";
import FormCard from "../components/FormCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function FormDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentResponseId, setSentResponseId] = useState(null);

  const isAuthor = form && user && form.author.id === user.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/forms/${id}`);
      setForm(res.data);
      if (user && res.data.author.id === user.id) {
        const r = await api.get(`/forms/${id}/responses`);
        setResponses(r.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить анкету");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSentResponseId(null);
    try {
      const res = await api.post(`/forms/${id}/responses`, {
        message: message.trim(),
      });
      setMessage("");
      setSentResponseId(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось отправить отклик");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить анкету безвозвратно?")) return;
    try {
      await api.delete(`/forms/${id}`);
      navigate("/forms/my", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось удалить");
    }
  };

  if (loading) return <div className="card"><p className="muted">Загрузка…</p></div>;
  if (!form)
    return (
      <div className="card">
        <p className="muted">Анкета не найдена.</p>
        <Link to="/forms" className="btn btn--ghost">Вернуться в ленту</Link>
      </div>
    );

  return (
    <div className="card">
      <div className="card__header">
        <h1>Анкета</h1>
        <Link to="/forms" className="btn btn--ghost">
          Назад в ленту
        </Link>
      </div>

      <FormCard
        form={form}
        showStatus={isAuthor}
        footer={
          isAuthor && (
            <div className="actions">
              <Link to={`/forms/${form.id}/edit`} className="btn btn--ghost btn--small">
                Редактировать
              </Link>
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={handleDelete}
              >
                Удалить
              </button>
            </div>
          )
        }
      />

      {error && <div className="form__error">{error}</div>}

      {!isAuthor && form.status === "approved" && (
        <section className="profile__section">
          <h2>Отправить отклик</h2>
          {sentResponseId && (
            <div className="sync-result">
              Отклик отправлен. Автор увидит его в разделе «Мои анкеты».{" "}
              <Link to={`/messages/${sentResponseId}`}>
                Открыть переписку
              </Link>
            </div>
          )}
          <form className="form" onSubmit={handleSend}>
            <div className="form__field">
              <textarea
                rows={4}
                placeholder="Привет! Я тоже играю по вечерам, могу созвониться в дискорде…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                minLength={1}
                maxLength={1000}
                required
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={sending || !message.trim()}
            >
              {sending ? "Отправляем…" : "Отправить"}
            </button>
          </form>
        </section>
      )}

      {isAuthor && (
        <section className="profile__section">
          <h2>Отклики ({responses.length})</h2>
          {responses.length === 0 ? (
            <p className="muted">
              Откликов пока нет. Когда кто-то ответит — увидите здесь.
            </p>
          ) : (
            <div className="responses">
              {responses.map((r) => (
                <div className="response" key={r.id}>
                  <div className="response__head">
                    <Link to={`/users/${r.sender.id}`} className="response__sender">
                      <div className="form-card__avatar form-card__avatar--small">
                        {r.sender.steam_avatar_url ? (
                          <img src={r.sender.steam_avatar_url} alt="" />
                        ) : (
                          <div className="form-card__avatar-placeholder">
                            {(r.sender.steam_persona_name || r.sender.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="response__persona">
                          {r.sender.steam_persona_name || r.sender.username}
                        </div>
                        <div className="muted response__login">@{r.sender.username}</div>
                      </div>
                    </Link>
                    <div className="response__date muted">
                      {new Date(r.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="response__text">{r.message}</div>
                  <div className="actions">
                    <Link
                      to={`/messages/${r.id}`}
                      className="btn btn--primary btn--small"
                    >
                      Открыть переписку
                    </Link>
                    <Link
                      to={`/users/${r.sender.id}`}
                      className="btn btn--ghost btn--small"
                    >
                      Профиль
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
