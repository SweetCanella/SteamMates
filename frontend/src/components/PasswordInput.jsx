import { useState } from "react";

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M2 5.3 3.3 4l16.7 16.7-1.3 1.3-3-3a11.7 11.7 0 0 1-3.7.6c-5 0-9-4.5-10-7a13.7 13.7 0 0 1 3.4-4.4L2 5.3zM12 7.5a4.5 4.5 0 0 1 4.5 4.5c0 .6-.1 1.2-.3 1.7l-2.4-2.4a2.3 2.3 0 0 0-3.1-3.1L8.3 5.8A11.7 11.7 0 0 1 12 5c5 0 9 4.5 10 7-.6 1.4-1.8 3.1-3.5 4.5l-2-2c.2-.5.3-1 .3-1.5a4.5 4.5 0 0 0-4.5-4.5c-.5 0-1 .1-1.5.3L8.3 6.5A4.5 4.5 0 0 1 12 7.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input
        id={id}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        tabIndex={-1}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}
