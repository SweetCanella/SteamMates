import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client.js";
import FormCard from "../components/FormCard.jsx";

const TABS = [
  { id: "pending", label: "На модерации" },
  { id: "approved", label: "Одобренные" },
  { id: "rejected", label: "Отклонённые" },
];

export default function ModerationPage() {
  const [tab, setTab] = useState("pending");
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/moderation/forms", { params: { status: tab } });
      setForms(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await api.post(`/moderation/forms/${id}/approve`);
      setForms((list) => list.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось одобрить");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const reason = prompt("Причина отклонения (можно оставить пустым):", "");
    if (reason === null) return;
    setBusyId(id);
    setError("");
    try {
      await api.post(`/moderation/forms/${id}/reject`, { reason });
      setForms((list) => list.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось отклонить");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <h1>Модерация анкет</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabs__item ${tab === t.id ? "tabs__item--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="form__error">{error}</div>}

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : forms.length === 0 ? (
        <p className="muted">
          {tab === "pending"
            ? "Нет анкет, ожидающих модерации."
            : "Список пуст."}
        </p>
      ) : (
        <div className="feed">
          {forms.map((f) => (
            <FormCard
              key={f.id}
              form={f}
              showStatus
              footer={
                <div className="actions">
                  <Link to={`/forms/${f.id}`} className="btn btn--ghost btn--small">
                    Открыть
                  </Link>
                  {tab !== "approved" && (
                    <button
                      type="button"
                      className="btn btn--primary btn--small"
                      onClick={() => approve(f.id)}
                      disabled={busyId === f.id}
                    >
                      Одобрить
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button
                      type="button"
                      className="btn btn--danger btn--small"
                      onClick={() => reject(f.id)}
                      disabled={busyId === f.id}
                    >
                      Отклонить
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
