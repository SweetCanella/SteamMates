# Frontend (React + Vite)

## Установка и запуск

```powershell
cd frontend
npm install
npm run dev
```

Приложение откроется на http://localhost:5173 и будет проксировать `/api/*` на бэкенд `http://127.0.0.1:8000`.

## Страницы

- `/login` — вход.
- `/register` — регистрация (новые пользователи получают роль `user`).
- `/dashboard` — заглушка для залогиненых.
- `/admin` — админ-панель со списком пользователей (только для роли `admin`).

## Сборка

```powershell
npm run build
npm run preview
```
