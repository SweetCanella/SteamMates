import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client.js";
import FormCard from "../components/FormCard.jsx";

export default function MyFormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/forms/my");
      setForms(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Удалить анкету безвозвратно?")) return;
    try {
      await api.delete(`/forms/${id}`);
      setForms((list) => list.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось удалить");
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <h1>Мои анкеты</h1>
        <Link to="/forms/new" className="btn btn--primary">
          + Создать
        </Link>
      </div>

      {error && <div className="form__error">{error}</div>}

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : forms.length === 0 ? (
        <p className="muted">
          Пока ни одной анкеты.{" "}
          <Link to="/forms/new">Создайте первую</Link> — мы её отмодерируем и опубликуем.
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
                  <Link
                    to={`/forms/${f.id}/edit`}
                    className="btn btn--ghost btn--small"
                  >
                    Редактировать
                  </Link>
                  {f.status === "approved" && f.responses_count > 0 && (
                    <Link
                      to={`/forms/${f.id}`}
                      className="btn btn--ghost btn--small"
                    >
                      Отклики ({f.responses_count})
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => handleDelete(f.id)}
                  >
                    Удалить
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
