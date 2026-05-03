import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="card">
      <h1>Личный кабинет</h1>
      <p className="lead">
        Привет, <strong>{user.username}</strong>! Вы успешно вошли в систему.
      </p>
      <p className="muted">
        Это заглушка для залогиненых пользователей — в дальнейшем здесь появится функционал.
      </p>

      <div className="info-grid">
        <div>
          <div className="info-grid__label">Email</div>
          <div>{user.email}</div>
        </div>
        <div>
          <div className="info-grid__label">Роль</div>
          <div>{user.role}</div>
        </div>
        <div>
          <div className="info-grid__label">ID</div>
          <div>#{user.id}</div>
        </div>
      </div>

      {user.role === "admin" && (
        <p className="muted">
          У вас права администратора — доступна{" "}
          <Link to="/admin">админ-панель</Link>.
        </p>
      )}
    </div>
  );
}
