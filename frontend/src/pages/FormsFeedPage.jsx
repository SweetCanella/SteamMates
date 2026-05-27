import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client.js";
import FormCard from "../components/FormCard.jsx";

const TIMEZONES = [];
for (let i = -12; i <= 14; i++) {
  const sign = i >= 0 ? "+" : "";
  TIMEZONES.push(`UTC${sign}${i}`);
}

const EMPTY_FILTERS = {
  gender: "",
  ageMin: "",
  ageMax: "",
  timezone: "",
  mode: "",
};

export default function FormsFeedPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/forms");
      setForms(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Не удалось загрузить анкеты");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }));

  const resetAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearch("");
  };

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "").length,
    [filters]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ageMin = filters.ageMin ? Number(filters.ageMin) : null;
    const ageMax = filters.ageMax ? Number(filters.ageMax) : null;
    const modeQ = filters.mode.trim().toLowerCase();

    return forms.filter((f) => {
      if (q && !f.game.name.toLowerCase().includes(q)) return false;
      if (filters.gender && f.gender !== filters.gender) return false;
      if (filters.timezone && f.timezone !== filters.timezone) return false;
      if (ageMin != null && f.age < ageMin) return false;
      if (ageMax != null && f.age > ageMax) return false;
      if (modeQ) {
        if (!f.mode || !f.mode.toLowerCase().includes(modeQ)) return false;
      }
      return true;
    });
  }, [forms, search, filters]);

  return (
    <div className="card">
      <div className="card__header">
        <h1>Лента анкет</h1>
        <Link to="/forms/new" className="btn btn--primary">
          + Создать анкету
        </Link>
      </div>

      <div className="feed__controls">
        <input
          type="text"
          placeholder="Поиск по названию игры…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="feed__search"
        />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowFilters((v) => !v)}
        >
          {showFilters ? "Скрыть фильтры" : "Фильтры"}
          {activeFiltersCount > 0 && (
            <span className="badge feed__filter-badge">{activeFiltersCount}</span>
          )}
        </button>
        {(activeFiltersCount > 0 || search) && (
          <button type="button" className="btn btn--ghost" onClick={resetAll}>
            Сбросить
          </button>
        )}
      </div>

      {showFilters && (
        <div className="filters">
          <div className="form__field">
            <label>Пол</label>
            <select
              value={filters.gender}
              onChange={(e) => setFilter("gender", e.target.value)}
            >
              <option value="">Любой</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <div className="form__field">
            <label>Возраст от</label>
            <input
              type="number"
              min={12}
              max={100}
              value={filters.ageMin}
              onChange={(e) => setFilter("ageMin", e.target.value)}
              placeholder="12"
            />
          </div>

          <div className="form__field">
            <label>Возраст до</label>
            <input
              type="number"
              min={12}
              max={100}
              value={filters.ageMax}
              onChange={(e) => setFilter("ageMax", e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="form__field">
            <label>Часовой пояс</label>
            <select
              value={filters.timezone}
              onChange={(e) => setFilter("timezone", e.target.value)}
            >
              <option value="">Любой</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="form__field">
            <label>Режим игры</label>
            <input
              type="text"
              value={filters.mode}
              onChange={(e) => setFilter("mode", e.target.value)}
              placeholder="Premier, Soloq…"
            />
          </div>
        </div>
      )}

      {error && <div className="form__error">{error}</div>}

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">
          {forms.length === 0
            ? "Пока ни одной одобренной анкеты. Будьте первым!"
            : "По заданным фильтрам ничего не найдено."}
        </p>
      ) : (
        <div className="feed">
          {filtered.map((f) => (
            <FormCard key={f.id} form={f} />
          ))}
        </div>
      )}
    </div>
  );
}
