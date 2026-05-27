import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">
        SteamMates
      </Link>
      <div className="navbar__links">
        {user ? (
          <>
            <NavLink to="/forms" className="navbar__link" end>
              Лента
            </NavLink>
            <NavLink to="/forms/my" className="navbar__link">
              Мои анкеты
            </NavLink>
            <NavLink to="/messages" className="navbar__link">
              Отклики
            </NavLink>
            <NavLink to="/profile" className="navbar__link">
              Профиль
            </NavLink>
            {user.role === "admin" && (
              <>
                <NavLink to="/moderation" className="navbar__link">
                  Модерация
                </NavLink>
                <NavLink to="/admin" className="navbar__link">
                  Админ
                </NavLink>
              </>
            )}
            <span className="navbar__user">
              {user.username} <span className="navbar__role">({user.role})</span>
            </span>
            <button type="button" onClick={handleLogout} className="btn btn--ghost">
              Выйти
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="navbar__link">
              Войти
            </NavLink>
            <NavLink to="/register" className="navbar__link">
              Регистрация
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
