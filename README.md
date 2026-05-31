# SteamMates

Локальный учебный проект — веб-сервис для поиска тиммейтов в играх Steam с анализом жанровых предпочтений пользователя.

- **Бэкенд**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + SQLite, JWT-авторизация, bcrypt, requests (Steam Web API).
- **Фронтенд**: React 18 + Vite 5 + React Router 6 + axios.
- **Запуск**: локальный (Uvicorn + Vite dev server).

## Требования

- Python 3.11+
- Node.js 18+ и npm
- Steam Web API key (https://steamcommunity.com/dev/apikey)

## Структура

```
kursach/
├── backend/        # FastAPI-приложение
│   ├── app/
│   │   ├── main.py             # точка входа, CORS, сидирование админа, мини-миграции
│   │   ├── config.py           # настройки из .env
│   │   ├── database.py         # SQLAlchemy engine / session
│   │   ├── models.py           # User, Game, Genre, UserGameStat, Form, FormResponse, ResponseMessage
│   │   ├── schemas.py          # Pydantic-схемы
│   │   ├── security.py         # хеширование паролей и JWT
│   │   ├── dependencies.py     # get_current_user / require_admin
│   │   ├── steam_api.py        # обёртка над Steam Web API
│   │   └── routers/
│   │       ├── auth.py         # /api/auth/register | /login | /me
│   │       ├── users.py        # /api/users (CRUD, только admin)
│   │       ├── steam.py        # /api/steam/link | /sync | /me/games | /me/genres
│   │       ├── games.py        # /api/games/my | /api/games/search
│   │       ├── forms.py        # /api/forms (анкеты + отклики)
│   │       ├── moderation.py   # /api/moderation/forms
│   │       ├── profiles.py     # /api/profiles/{user_id}
│   │       └── threads.py      # /api/threads (переписка)
│   └── requirements.txt
└── frontend/       # React + Vite
    └── src/
        ├── main.jsx
        ├── App.jsx             # маршруты
        ├── api/client.js       # axios c Bearer-токеном
        ├── context/AuthContext.jsx
        ├── components/         # NavBar, ProtectedRoute, FormCard, GenreRadar, GenreBars и др.
        └── pages/
            ├── LoginPage.jsx, RegisterPage.jsx
            ├── ProfilePage.jsx          # личный кабинет: Steam, жанры, игры
            ├── UserProfilePage.jsx      # публичный профиль другого пользователя
            ├── FormsFeedPage.jsx        # лента анкет с фильтрами
            ├── FormCreatePage.jsx, FormEditPage.jsx, FormDetailPage.jsx
            ├── MyFormsPage.jsx          # свои анкеты
            ├── ModerationPage.jsx       # модерация (admin)
            ├── MessagesPage.jsx         # список тредов
            ├── ThreadPage.jsx           # переписка по отклику
            └── AdminPage.jsx            # управление пользователями
```

## Запуск

Нужны два терминала — один для бэка, один для фронта.

### 1. Бэкенд

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

- Swagger UI: http://127.0.0.1:8001/docs
- База SQLite (`backend/app.db`) создаётся автоматически при первом запуске.
- Если в базе нет ни одного администратора, автоматически создаётся дефолтный:
  - логин: `admin`
  - пароль: `admin123`

### 2. Фронтенд

```powershell
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173. Vite проксирует `/api/*` на бэкенд (`127.0.0.1:8001`), поэтому CORS настраивать не нужно.

## Что умеет

- **Регистрация / вход** — JWT в `localStorage`, bcrypt-хеш пароля.
- **Привязка Steam** по SteamID64, vanity-имени или ссылке на профиль; хранится persona, аватар, суммарный playtime.
- **Импорт игр** из Steam Web API: учитываются только игры с наигранным временем от 10 часов.
- **Анализ жанров** — radar-диаграмма топ-жанров и горизонтальные бары с долей часов.
- **Анкеты поиска тиммейтов** — поля игры, пола, возраста, часового пояса, активности, режима, описания. Перед публикацией — модерация админом.
- **Лента анкет** — поиск по игре + фильтры (пол, возраст, часовой пояс, режим).
- **Отклики и переписка** — отдельный тред на каждый отклик, обновление сообщений через polling.
- **Публичные профили** — просмотр Steam-данных, жанров и списка игр другого пользователя.
- **Админ-панель** (`/admin`) — список пользователей, смена роли `user` ↔ `admin`, блокировка / разблокировка, удаление. Админ не может понизить или заблокировать самого себя.
- **Модерация анкет** (`/moderation`) — вкладки `pending` / `approved` / `rejected`, одобрение и отклонение с причиной.

## Настройки

Создать `backend/.env`:

```
SECRET_KEY=change-this
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./app.db
STEAM_API_KEY=your-steam-web-api-key
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```
