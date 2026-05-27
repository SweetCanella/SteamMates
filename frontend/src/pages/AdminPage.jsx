import { useCallback, useEffect, useState } from "react";

import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import manImg from "../../img/man.png";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showMan, setShowMan] = useState(true);

  useEffect(() => {
    // 10 сек выезжает + 2 сек висит + 5 сек растворяется
    const t = setTimeout(() => setShowMan(false), 17000);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchUser = async (id, payload) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await api.patch(`/users/${id}`, payload);
      setUsers((list) => list.map((u) => (u.id === id ? res.data : u)));
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось обновить пользователя");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Удалить пользователя безвозвратно?")) return;
    setBusyId(id);
    setError(null);
    try {
      await api.delete(`/users/${id}`);
      setUsers((list) => list.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось удалить пользователя");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <h1>Админ-панель</h1>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="form__error">{error}</div>}

      {loading ? (
        <div className="muted">Загрузка...</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const disabled = busyId === u.id;
                return (
                  <tr key={u.id} className={!u.is_active ? "row--inactive" : ""}>
                    <td>#{u.id}</td>
                    <td>
                      {u.username}
                      {isSelf && <span className="badge">вы</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={disabled || isSelf}
                        onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status ${u.is_active ? "status--ok" : "status--bad"}`}>
                        {u.is_active ? "активен" : "заблокирован"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={disabled || isSelf}
                          onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                        >
                          {u.is_active ? "Заблокировать" : "Разблокировать"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger"
                          disabled={disabled || isSelf}
                          onClick={() => deleteUser(u.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showMan && <img src={manImg} alt="" className="peek-man" />}
    </div>
  );
}
