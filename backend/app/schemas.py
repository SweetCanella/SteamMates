from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import FormStatus, Gender, UserRole


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    steam_id: str | None = None
    steam_persona_name: str | None = None
    steam_avatar_url: str | None = None
    steam_total_playtime_minutes: int | None = None
    steam_last_synced_at: datetime | None = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    username: str
    password: str


class SteamLinkRequest(BaseModel):
    # принимаем либо 17-значный SteamID64, либо vanity-имя/ссылку на профиль
    steam_input: str = Field(min_length=1, max_length=128)


class GameRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    steam_app_id: int
    name: str
    header_image: str | None = None
    genres: list[str] = []


class UserGameStatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    game: GameRead
    playtime_minutes: int
    playtime_hours: float


class GenreStat(BaseModel):
    name: str
    games_count: int
    total_hours: float


class SteamSyncResult(BaseModel):
    imported: int
    skipped_under_threshold: int
    total_owned: int
    threshold_hours: int


class GameSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    steam_app_id: int
    name: str
    header_image: str | None = None
    in_my_library: bool = False


# --- Анкеты ---

class FormAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    steam_persona_name: str | None = None
    steam_avatar_url: str | None = None


class FormBase(BaseModel):
    gender: Gender
    age: int = Field(ge=12, le=100)
    timezone: str = Field(min_length=1, max_length=16)
    activity_hours: str = Field(min_length=1, max_length=64)
    mode: str | None = Field(default=None, max_length=64)
    description: str = Field(min_length=10, max_length=2000)


class FormCreate(FormBase):
    game_id: int


class FormUpdate(BaseModel):
    gender: Gender | None = None
    age: int | None = Field(default=None, ge=12, le=100)
    timezone: str | None = Field(default=None, min_length=1, max_length=16)
    activity_hours: str | None = Field(default=None, min_length=1, max_length=64)
    mode: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, min_length=10, max_length=2000)


class FormRead(FormBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: FormStatus
    reject_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    author: FormAuthor
    game: GameRead
    responses_count: int = 0


class ModerationDecision(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class FormResponseCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class FormResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message: str
    created_at: datetime
    sender: FormAuthor


class ChatMessage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int  # 0 для стартового сообщения, реальный id для остальных
    text: str
    created_at: datetime
    sender_id: int


class ThreadMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ThreadDetail(BaseModel):
    response_id: int
    form_id: int
    form_game_name: str
    form_status: FormStatus
    author: FormAuthor      # автор анкеты
    responder: FormAuthor   # тот, кто откликнулся
    messages: list[ChatMessage]
    started_at: datetime


class ThreadListItem(BaseModel):
    response_id: int
    form_id: int
    form_game_name: str
    form_game_header: str | None = None
    counterparty: FormAuthor  # с кем переписываюсь (не я)
    my_role: str              # "author" или "responder"
    started_at: datetime      # когда был отправлен сам отклик
    messages_count: int       # сколько сообщений в треде (включая стартовое)


class PublicProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    steam_id: str | None = None
    steam_persona_name: str | None = None
    steam_avatar_url: str | None = None
    steam_total_playtime_minutes: int | None = None
    steam_last_synced_at: datetime | None = None
    created_at: datetime
    games: list[UserGameStatRead] = []
    genres: list[GenreStat] = []
    forms_count: int = 0
