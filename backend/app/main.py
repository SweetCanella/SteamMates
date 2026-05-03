from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User, UserRole
from .routers import auth, users
from .security import hash_password


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
    _seed_default_admin()
    yield


app = FastAPI(title="Kursach API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
