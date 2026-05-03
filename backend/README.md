# Backend (FastAPI)

## Установка

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Запуск

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

## Учётная запись администратора по умолчанию

При первом старте, если в БД нет ни одного админа, создаётся:

- логин: `admin`
- пароль: `admin123`

Настраивается через переменные окружения (файл `.env`):

```
SECRET_KEY=...
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=...
```

## Структура

- `app/main.py` — точка входа, CORS, lifespan, сидирование админа.
- `app/models.py` — SQLAlchemy-модель `User` с ролью (`user`/`admin`).
- `app/schemas.py` — Pydantic-схемы запросов/ответов.
- `app/security.py` — хеширование паролей (bcrypt) и JWT.
- `app/dependencies.py` — `get_current_user`, `require_admin`.
- `app/routers/auth.py` — `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
- `app/routers/users.py` — админское CRUD над пользователями.
