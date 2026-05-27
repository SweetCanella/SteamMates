from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, PyEnum):
    user = "user"
    admin = "admin"


class Gender(str, PyEnum):
    male = "male"
    female = "female"
    other = "other"


class FormStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# m2m: какие жанры есть у игры
game_genres = Table(
    "game_genres",
    Base.metadata,
    Column("game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False), default=UserRole.user, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    steam_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    steam_persona_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    steam_avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # суммарный playtime по всей библиотеке Steam (включая <10ч), в минутах
    steam_total_playtime_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # когда библиотеку Steam последний раз синхронизировали
    steam_last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    game_stats: Mapped[list["UserGameStat"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    forms: Mapped[list["Form"]] = relationship(
        back_populates="author", cascade="all, delete-orphan", foreign_keys="Form.author_id"
    )


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    steam_app_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    header_image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    genres: Mapped[list["Genre"]] = relationship(
        secondary=game_genres, back_populates="games"
    )


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    games: Mapped[list[Game]] = relationship(
        secondary=game_genres, back_populates="genres"
    )


class UserGameStat(Base):
    __tablename__ = "user_game_stats"
    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_user_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    playtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="game_stats")
    game: Mapped[Game] = relationship()


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )

    gender: Mapped[Gender] = mapped_column(
        Enum(Gender, native_enum=False), nullable=False
    )
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    timezone: Mapped[str] = mapped_column(String(16), nullable=False)
    activity_hours: Mapped[str] = mapped_column(String(64), nullable=False)
    mode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, native_enum=False), default=FormStatus.pending, nullable=False, index=True
    )
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    author: Mapped[User] = relationship(back_populates="forms", foreign_keys=[author_id])
    game: Mapped[Game] = relationship()
    responses: Mapped[list["FormResponse"]] = relationship(
        back_populates="form", cascade="all, delete-orphan"
    )


class FormResponse(Base):
    __tablename__ = "form_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    form: Mapped[Form] = relationship(back_populates="responses")
    sender: Mapped[User] = relationship()
    messages: Mapped[list["ResponseMessage"]] = relationship(
        back_populates="response", cascade="all, delete-orphan"
    )


class ResponseMessage(Base):
    __tablename__ = "response_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("form_responses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    response: Mapped[FormResponse] = relationship(back_populates="messages")
    sender: Mapped[User] = relationship()
