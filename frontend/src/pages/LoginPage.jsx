import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      const redirect = location.state?.from?.pathname || "/forms";
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Вход</h1>
      <form onSubmit={handleSubmit} className="form">
        <label className="form__field">
          <span>Логин</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="form__field">
          <span>Пароль</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="form__error">{error}</div>}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Входим..." : "Войти"}
        </button>
      </form>
      <p className="auth-card__footer">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
