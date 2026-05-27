from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..dependencies import require_admin
from ..models import Form, FormStatus, Game, User
from ..schemas import FormRead, ModerationDecision

router = APIRouter(prefix="/api/moderation", tags=["moderation"])


def _to_read(form: Form) -> FormRead:
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
        game={
            "id": form.game.id,
            "steam_app_id": form.game.steam_app_id,
            "name": form.game.name,
            "header_image": form.game.header_image,
            "genres": [g.name for g in form.game.genres],
        },
    )


@router.get("/forms", response_model=list[FormRead])
def list_for_moderation(
    status_filter: FormStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[FormRead]:
    q = db.query(Form).options(
        selectinload(Form.author),
        selectinload(Form.game).selectinload(Game.genres),
    )
    if status_filter is not None:
        q = q.filter(Form.status == status_filter)
    q = q.order_by(Form.created_at.asc())
    return [_to_read(f) for f in q.all()]


def _get_form(db: Session, form_id: int) -> Form:
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


@router.post("/forms/{form_id}/approve", response_model=FormRead)
def approve(
    form_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> FormRead:
    form = _get_form(db, form_id)
    form.status = FormStatus.approved
    form.reject_reason = None
    db.commit()
    db.refresh(form)
    return _to_read(form)


@router.post("/forms/{form_id}/reject", response_model=FormRead)
def reject(
    form_id: int,
    payload: ModerationDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> FormRead:
    form = _get_form(db, form_id)
    form.status = FormStatus.rejected
    form.reject_reason = (payload.reason or "").strip() or "Без указания причины"
    db.commit()
    db.refresh(form)
    return _to_read(form)
