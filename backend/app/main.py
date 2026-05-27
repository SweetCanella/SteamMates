from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User, UserRole
from .routers import auth, forms, games, moderation, profiles, steam, threads, users
from .security import hash_password


def _apply_simple_migrations() -> None:
    # доливаем недостающие колонки в users, если БД создавалась со старой схемой.
    # без alembic'а — на курсовой и так сойдёт
    pending = [
        ("steam_last_synced_at", "DATETIME"),
    ]
    with engine.begin() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)")).all()}
        for name, ddl in pending:
            if name not in cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))


def _seed_default_admin() -> None:
    db = SessionLocal()
    try:
        has_admin = db.query(User).filter(User.role == UserRole.admin).first() is not None
        if has_admin:
            return
        admin = User(
            username=settings.default_admin_username,
            email=settings.default_admin_email,
            hashed_password=hash_password(settings.default_admin_password),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    _apply_simple_migrations()
    _seed_default_admin()
    yield


app = FastAPI(title="SteamMates API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(steam.router)
app.include_router(games.router)
app.include_router(forms.router)
app.include_router(moderation.router)
app.include_router(profiles.router)
app.include_router(threads.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
