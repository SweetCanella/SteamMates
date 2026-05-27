from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Form, FormResponse, FormStatus, Game, User
from ..schemas import (
    FormCreate,
    FormRead,
    FormResponseCreate,
    FormResponseRead,
    FormUpdate,
    GameRead,
)

router = APIRouter(prefix="/api/forms", tags=["forms"])


def _game_to_read(game: Game) -> GameRead:
    return GameRead(
        id=game.id,
        steam_app_id=game.steam_app_id,
        name=game.name,
        header_image=game.header_image,
        genres=[g.name for g in game.genres],
    )


def _form_to_read(form: Form, responses_count: int = 0) -> FormRead:
    return FormRead(
        id=form.id,
        gender=form.gender,
        age=form.age,
        timezone=form.timezone,
        activity_hours=form.activity_hours,
        mode=form.mode,
        description=form.description,
        status=form.status,
        reject_reason=form.reject_reason,
        created_at=form.created_at,
        updated_at=form.updated_at,
        author={
            "id": form.author.id,
            "username": form.author.username,
            "steam_persona_name": form.author.steam_persona_name,
            "steam_avatar_url": form.author.steam_avatar_url,
        },
        game=_game_to_read(form.game),
        responses_count=responses_count,
    )


def _count_responses(db: Session, form_ids: list[int]) -> dict[int, int]:
    if not form_ids:
        return {}
    from sqlalchemy import func
    rows = (
        db.query(FormResponse.form_id, func.count(FormResponse.id))
        .filter(FormResponse.form_id.in_(form_ids))
        .group_by(FormResponse.form_id)
        .all()
    )
    return {fid: cnt for fid, cnt in rows}


def _load_forms(db: Session, query) -> list[Form]:
    return query.options(
        selectinload(Form.author),
        selectinload(Form.game).selectinload(Game.genres),
    ).all()


@router.get("", response_model=list[FormRead])
def feed(
    game_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[FormRead]:
    """Лента — только одобренные анкеты, опционально с фильтром по игре."""
    q = db.query(Form).filter(Form.status == FormStatus.approved)
    if game_id is not None:
        q = q.filter(Form.game_id == game_id)
    q = q.order_by(Form.updated_at.desc())
    forms = _load_forms(db, q)
    counts = _count_responses(db, [f.id for f in forms])
    return [_form_to_read(f, counts.get(f.id, 0)) for f in forms]


@router.get("/my", response_model=list[FormRead])
def my_forms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FormRead]:
    q = (
        db.query(Form)
        .filter(Form.author_id == current_user.id)
        .order_by(Form.updated_at.desc())
    )
    forms = _load_forms(db, q)
    counts = _count_responses(db, [f.id for f in forms])
    return [_form_to_read(f, counts.get(f.id, 0)) for f in forms]


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED)
def create_form(
    payload: FormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FormRead:
    game = db.get(Game, payload.game_id)
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Игра не найдена")

    # одна активная анкета на игру: pending или approved блокируют создание новой
    existing = (
        db.query(Form)
        .filter(
            Form.author_id == current_user.id,
            Form.game_id == game.id,
            Form.status != FormStatus.rejected,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="У вас уже есть анкета по этой игре. Удалите старую или отредактируйте.",
        )

    form = Form(
        author_id=current_user.id,
        game_id=game.id,
        gender=payload.gender,
        age=payload.age,
        timezone=payload.timezone,
        activity_hours=payload.activity_hours,
        mode=payload.mode or None,
        description=payload.description,
        status=FormStatus.pending,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    # подгрузим связи для ответа
    db.refresh(form, attribute_names=["author", "game"])
    return _form_to_read(form, 0)


def _get_form_or_404(db: Session, form_id: int) -> Form:
    form = (
        db.query(Form)
        .options(
            selectinload(Form.author),
            selectinload(Form.game).selectinload(Game.genres),
        )
        .filter(Form.id == form_id)
        .first()
    )
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Анкета не найдена")
    return form


@router.get("/{form_id}", response_model=FormRead)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FormRead:
    form = _get_form_or_404(db, form_id)
    # видна только автору / админу / если approved
    if (
        form.status != FormStatus.approved
        and form.author_id != current_user.id
        and current_user.role.value != "admin"
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Анкета не найдена")
    cnt = _count_responses(db, [form.id]).get(form.id, 0)
    return _form_to_read(form, cnt)


@router.patch("/{form_id}", response_model=FormRead)
def update_form(
    form_id: int,
    payload: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FormRead:
    form = _get_form_or_404(db, form_id)
    if form.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваша анкета"
        )

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(form, key, value)

    # после редактирования анкета снова уходит на модерацию
    form.status = FormStatus.pending
    form.reject_reason = None

    db.commit()
    db.refresh(form)
    db.refresh(form, attribute_names=["author", "game"])
    cnt = _count_responses(db, [form.id]).get(form.id, 0)
    return _form_to_read(form, cnt)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Анкета не найдена")
    if form.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваша анкета"
        )
    db.delete(form)
    db.commit()


# --- отклики ---

@router.post(
    "/{form_id}/responses",
    response_model=FormResponseRead,
    status_code=status.HTTP_201_CREATED,
)
def respond(
    form_id: int,
    payload: FormResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FormResponse:
    form = db.get(Form, form_id)
    if form is None or form.status != FormStatus.approved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Анкета недоступна")
    if form.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя откликнуться на собственную анкету",
        )

    response = FormResponse(
        form_id=form.id,
        sender_id=current_user.id,
        message=payload.message,
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    db.refresh(response, attribute_names=["sender"])
    return response


@router.get("/{form_id}/responses", response_model=list[FormResponseRead])
def list_responses(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FormResponse]:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Анкета не найдена")
    if form.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Отклики видны только автору анкеты",
        )
    return (
        db.query(FormResponse)
        .options(selectinload(FormResponse.sender))
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.created_at.desc())
        .all()
    )
