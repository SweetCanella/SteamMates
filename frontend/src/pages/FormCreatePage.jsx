import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client.js";
import FormFields from "../components/FormFields.jsx";
import GamePicker from "../components/GamePicker.jsx";

const INITIAL = {
  gender: "male",
  age: "20",
  timezone: "UTC+3",
  activity_hours: "",
  mode: "",
  description: "",
};

export default function FormCreatePage() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [fields, setFields] = useState(INITIAL);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!game) {
      setError("Выберите игру");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        game_id: game.id,
        gender: fields.gender,
        age: Number(fields.age),
        timezone: fields.timezone,
        activity_hours: fields.activity_hours.trim(),
        mode: fields.mode.trim() || null,
        description: fields.description.trim(),
      };
      await api.post("/forms", payload);
      navigate("/forms/my", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось создать анкету");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <h1>Новая анкета</h1>
        <Link to="/forms" className="btn btn--ghost">
          Назад в ленту
        </Link>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__field">
          <label>Игра</label>
          <GamePicker value={game} onChange={setGame} disabled={submitting} />
          <div className="muted form__hint">
            Выбирайте из своей библиотеки или ищите в общей базе. На каждую игру может
            быть только одна активная анкета.
          </div>
        </div>

        <FormFields values={fields} onChange={setFields} disabled={submitting} />

        {error && <div className="form__error">{error}</div>}

        <div className="actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !game}
          >
            {submitting ? "Отправляем…" : "Отправить на модерацию"}
          </button>
          <Link to="/forms" className="btn btn--ghost">
            Отмена
          </Link>
        </div>
        <p className="muted">
          После создания анкета уходит на модерацию администратора и появляется в ленте
          только после одобрения.
        </p>
      </form>
    </div>
  );
}
