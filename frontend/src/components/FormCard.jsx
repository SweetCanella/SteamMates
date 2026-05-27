import { Link } from "react-router-dom";

const GENDER_LABELS = {
  male: "М",
  female: "Ж",
  other: "Другое",
};

const STATUS_LABELS = {
  pending: "На модерации",
  approved: "Опубликована",
  rejected: "Отклонена",
};

export default function FormCard({ form, showStatus = false, footer }) {
  const author = form.author;
  return (
    <div className="form-card">
      {form.game.header_image && (
        <Link to={`/forms/${form.id}`} className="form-card__cover">
          <img src={form.game.header_image} alt={form.game.name} loading="lazy" />
        </Link>
      )}
      <div className="form-card__body">
        <div className="form-card__top">
          <Link to={`/forms/${form.id}`} className="form-card__game">
            {form.game.name}
          </Link>
          {showStatus && (
            <span className={`status status--${form.status}`}>
              {STATUS_LABELS[form.status]}
            </span>
          )}
        </div>

        <Link to={`/users/${author.id}`} className="form-card__author">
          <div className="form-card__avatar">
            {author.steam_avatar_url ? (
              <img src={author.steam_avatar_url} alt="" />
            ) : (
              <div className="form-card__avatar-placeholder">
                {(author.steam_persona_name || author.username || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="form-card__author-info">
            <div className="form-card__persona">
              {author.steam_persona_name || author.username}
            </div>
            <div className="form-card__login muted">@{author.username}</div>
          </div>
        </Link>

        <div className="form-card__meta">
          <span>{GENDER_LABELS[form.gender] || form.gender}</span>
          <span>{form.age} лет</span>
          <span>{form.timezone}</span>
          <span>{form.activity_hours}</span>
          {form.mode && <span className="form-card__mode">{form.mode}</span>}
        </div>

        <p className="form-card__desc">{form.description}</p>

        {form.status === "rejected" && form.reject_reason && (
          <div className="form-card__reject">
            <b>Причина отклонения:</b> {form.reject_reason}
          </div>
        )}

        {footer && <div className="form-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
