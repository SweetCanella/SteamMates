import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing__hero">
        <h1 className="landing__title">SteamMates</h1>
        <p className="landing__subtitle">
          Сервис для поиска тиммейтов в играх Steam с учётом ваших жанровых предпочтений.
        </p>
        <div className="landing__actions">
          <Link to="/register" className="btn btn--primary btn--big">
            Регистрация
          </Link>
          <Link to="/login" className="btn btn--ghost btn--big">
            Войти
          </Link>
        </div>
      </section>

      <section className="landing__features">
        <div className="landing__feature">
          <h3>Привязка Steam</h3>
          <p>
            Подключите свой аккаунт и сервис автоматически подтянет список игр, в которых
            у вас наиграно от 10 часов.
          </p>
        </div>
        <div className="landing__feature">
          <h3>Анализ жанров</h3>
          <p>
            На основе вашей библиотеки строится диаграмма любимых жанров — видно, во что
            вы реально играете.
          </p>
        </div>
        <div className="landing__feature">
          <h3>Анкеты тиммейтов</h3>
          <p>
            Создавайте анкеты для поиска напарников в конкретной игре. Указывайте часовой
            пояс, режим, удобное время — другие игроки сами вас найдут.
          </p>
        </div>
        <div className="landing__feature">
          <h3>Переписка</h3>
          <p>
            Откликнулись на анкету — сразу открывается чат с автором. Без переходов в
            Discord или ВК.
          </p>
        </div>
      </section>
    </div>
  );
}
