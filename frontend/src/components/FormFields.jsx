const TIMEZONES = [];
for (let i = -12; i <= 14; i++) {
  const sign = i >= 0 ? "+" : "";
  TIMEZONES.push(`UTC${sign}${i}`);
}

export default function FormFields({ values, onChange, disabled = false }) {
  const set = (k, v) => onChange({ ...values, [k]: v });

  return (
    <>
      <div className="form__row">
        <div className="form__field">
          <label>Пол</label>
          <select
            value={values.gender}
            onChange={(e) => set("gender", e.target.value)}
            disabled={disabled}
          >
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
            <option value="other">Другое</option>
          </select>
        </div>

        <div className="form__field">
          <label>Возраст</label>
          <input
            type="number"
            min={12}
            max={100}
            value={values.age}
            onChange={(e) => set("age", e.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div className="form__field">
          <label>Часовой пояс</label>
          <select
            value={values.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            disabled={disabled}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label>Часы активности</label>
          <input
            type="text"
            placeholder="Например, 18:00–24:00"
            value={values.activity_hours}
            onChange={(e) => set("activity_hours", e.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div className="form__field">
          <label>Режим игры (необязательно)</label>
          <input
            type="text"
            placeholder="Premier, Soloq, Faceit и т.п."
            value={values.mode}
            onChange={(e) => set("mode", e.target.value)}
            disabled={disabled}
            maxLength={64}
          />
        </div>
      </div>

      <div className="form__field">
        <label>О себе и что ищу</label>
        <textarea
          rows={6}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          minLength={10}
          maxLength={2000}
          placeholder="Расскажите, кого ищете, в каком стиле играете, есть ли голосовой чат…"
          disabled={disabled}
          required
        />
        <div className="muted form__hint">
          От 10 символов. Минимум общего описания, чтобы было понятно, кого хочется найти.
        </div>
      </div>
    </>
  );
}
