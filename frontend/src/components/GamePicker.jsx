import { useCallback, useEffect, useRef, useState } from "react";

import api from "../api/client.js";

export default function GamePicker({ value, onChange, disabled = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // загрузка своей библиотеки один раз при монтировании
  useEffect(() => {
    let cancelled = false;
    api
      .get("/games/my")
      .then((res) => {
        if (!cancelled) setMyGames(res.data);
      })
      .catch(() => {
        if (!cancelled) setMyGames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // поиск с дебаунсом по введённому запросу
  useEffect(() => {
    if (!open) return undefined;
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(() => {
      setLoading(true);
      api
        .get("/games/search", { params: { q: query.trim() } })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // закрытие при клике вне
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handlePick = useCallback(
    (game) => {
      onChange(game);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const showMy = !query.trim();
  const list = showMy ? myGames : results;

  return (
    <div className="game-picker" ref={containerRef}>
      {value ? (
        <div className="game-picker__selected">
          {value.header_image && (
            <img src={value.header_image} alt="" className="game-picker__thumb" />
          )}
          <span className="game-picker__name">{value.name}</span>
          {!disabled && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onChange(null)}
            >
              Изменить
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Начните вводить название игры…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            disabled={disabled}
          />
          {open && (
            <div className="game-picker__dropdown">
              {showMy && myGames.length > 0 && (
                <div className="game-picker__group-title">Моя библиотека</div>
              )}
              {loading && <div className="game-picker__hint">Ищем…</div>}
              {!loading && list.length === 0 && (
                <div className="game-picker__hint muted">
                  {showMy
                    ? "Импортируйте библиотеку из Steam в профиле, чтобы выбирать игры из своих."
                    : "Игра не найдена. Возможно, никто ещё не импортировал её."}
                </div>
              )}
              {list.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className="game-picker__item"
                  onClick={() => handlePick(g)}
                >
                  {g.header_image && <img src={g.header_image} alt="" />}
                  <span className="game-picker__item-name">{g.name}</span>
                  {g.in_my_library && (
                    <span className="badge game-picker__own">в библиотеке</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
