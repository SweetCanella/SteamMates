export default function GenreBars({ genres, totalPlaytimeMinutes }) {
  if (!genres.length) return null;
  const max = genres[0].total_hours || 1;

  const totalHours =
    totalPlaytimeMinutes != null ? Math.round(totalPlaytimeMinutes / 60) : null;

  return (
    <div className="genre-bars">
      <div className="genre-bars__summary">
        Всего жанров: <b>{genres.length}</b>.{" "}
        {totalHours != null ? (
          <>
            Суммарно по играм: <b>{totalHours} ч</b> (включая игры, в которых
            наиграно меньше 10 часов).
          </>
        ) : (
          <>Данных по суммарному времени нет — обновите библиотеку.</>
        )}
      </div>
      <div className="genre-bars__list">
        {genres.map((g) => (
          <div className="genre-bars__row" key={g.name}>
            <div className="genre-bars__label" title={g.name}>
              {g.name}
            </div>
            <div className="genre-bars__bar-wrap">
              <div
                className="genre-bars__bar"
                style={{ width: `${(g.total_hours / max) * 100}%` }}
              />
            </div>
            <div className="genre-bars__value">
              {g.total_hours} ч
              <span className="muted">  ·  {g.games_count} игр</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
