import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../api/client.js";
import FormFields from "../components/FormFields.jsx";

export default function FormEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/forms/${id}`)
      .then((res) => {
        if (cancelled) return;
        setForm(res.data);
        setFields({
          gender: res.data.gender,
          age: String(res.data.age),
          timezone: res.data.timezone,
          activity_hours: res.data.activity_hours,
          mode: res.data.mode || "",
          description: res.data.description,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || "Не удалось загрузить");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        gender: fields.gender,
        age: Number(fields.age),
        timezone: fields.timezone,
        activity_hours: fields.activity_hours.trim(),
        mode: fields.mode.trim() || null,
        description: fields.description.trim(),
      };
      await api.patch(`/forms/${id}`, payload);
      navigate(`/forms/${id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="card"><p className="muted">Загрузка…</p></div>;
  if (!form || !fields)
    return (
      <div className="card">
        <p className="muted">{error || "Анкета не найдена"}</p>
        <Link to="/forms/my" className="btn btn--ghost">Назад к моим анкетам</Link>
      </div>
    );

  return (
    <div className="card">
      <div className="card__header">
        <h1>Редактирование анкеты</h1>
        <Link to={`/forms/${id}`} className="btn btn--ghost">
          Отмена
        </Link>
      </div>

      <div className="muted form__hint" style={{ marginBottom: 16 }}>
        Игра: <b style={{ color: "var(--text-strong)" }}>{form.game.name}</b>.
        Игру в анкете изменить нельзя — удалите её и создайте новую при необходимости.
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <FormFields values={fields} onChange={setFields} disabled={submitting} />

        {error && <div className="form__error">{error}</div>}

        <p className="muted">
          После сохранения анкета снова уйдёт на модерацию.
        </p>

        <div className="actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Сохраняем…" : "Сохранить"}
          </button>
          <Link to={`/forms/${id}`} className="btn btn--ghost">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
