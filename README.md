# Kursach

Локальный учебный проект: сайт с регистрацией, личным кабинетом и админ-панелью.

- **Бэкенд**: Python + FastAPI + SQLAlchemy + SQLite, JWT-авторизация, bcrypt.
- **Фронтенд**: React 18 + Vite + React Router + axios.
- **Хостинг**: локальный (Uvicorn + Vite dev server).

## Требования

- Python 3.11+
- Node.js 18+ и npm

## Структура

```
kursach/
├── backend/        # FastAPI-приложение
│   ├── app/
│   │   ├── main.py             # точка входа, CORS, сидирование админа
│   │   ├── config.py           # настройки (env)
│   │   ├── database.py         # SQLAlchemy engine / session
│   │   ├── models.py           # модель User + enum ролей
│   │   ├── schemas.py          # Pydantic-схемы
│   │   ├── security.py         # хеширование паролей и JWT
│   │   ├── dependencies.py     # get_current_user / require_admin
│   │   └── routers/
│   │       ├── auth.py         # /api/auth/register | /login | /me
│   │       └── users.py        # /api/users (CRUD, только admin)
│   └── requirements.txt
└── frontend/       # React + Vite
    └── src/
        ├── main.jsx
        ├── App.jsx             # маршруты
        ├── api/client.js       # axios c Bearer-токеном
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── NavBar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── DashboardPage.jsx   # заглушка для залогиненых
            └── AdminPage.jsx       # управление пользователями
```

## Запуск

Нужны два терминала — один для бэка, один для фронта.

### 1. Бэкенд

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger UI: http://127.0.0.1:8000/docs
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

Приложение: http://localhost:5173. Vite проксирует `/api/*` на бэкенд, поэтому CORS/портов между ними настраивать не нужно.

## Что умеет

- **Регистрация** нового пользователя (`/register`) — роль `user` по умолчанию.
- **Вход** (`/login`) — выдаёт JWT, который хранится в `localStorage`.
- **Личный кабинет** (`/dashboard`) — заглушка для залогиненых.
- **Админ-панель** (`/admin`) — только для роли `admin`:
  - список всех пользователей;
  - смена роли `user` ↔ `admin`;
  - блокировка/разблокировка;
  - удаление.
- Админ не может понизить/заблокировать/удалить самого себя — серверная проверка.

## Настройки

Можно создать `backend/.env`, чтобы переопределить дефолты:

```
SECRET_KEY=change-this-in-prod
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./app.db
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```
