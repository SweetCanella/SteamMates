import { NavLink, useNavigate } from "react-router-dom";

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
      <div className="navbar__brand">Kursach</div>
      <div className="navbar__links">
        {user ? (
          <>
            <NavLink to="/dashboard" className="navbar__link">
              Личный кабинет
            </NavLink>
            {user.role === "admin" && (
              <NavLink to="/admin" className="navbar__link">
                Админ-панель
              </NavLink>
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
