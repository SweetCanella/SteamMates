from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Form, FormResponse, ResponseMessage, User
from ..schemas import (
    ChatMessage,
    FormAuthor,
    ThreadDetail,
    ThreadListItem,
    ThreadMessageCreate,
)

router = APIRouter(prefix="/api/threads", tags=["threads"])


def _author(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "steam_persona_name": user.steam_persona_name,
        "steam_avatar_url": user.steam_avatar_url,
    }


def _check_access(response: FormResponse, user: User) -> tuple[bool, bool]:
    """Возвращает (is_author, is_responder). Если оба False — доступа нет."""
    is_author = response.form.author_id == user.id
    is_responder = response.sender_id == user.id
    return is_author, is_responder


def _load_response(db: Session, response_id: int) -> FormResponse:
    response = (
        db.query(FormResponse)
        .options(
            selectinload(FormResponse.form).selectinload(Form.author),
            selectinload(FormResponse.sender),
            selectinload(FormResponse.messages),
        )
        .filter(FormResponse.id == response_id)
        .first()
    )
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Диалог не найден")
    return response


@router.get("", response_model=list[ThreadListItem])
def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ThreadListItem]:
    # все отклики, где я — автор анкеты или sender отклика
    responses = (
        db.query(FormResponse)
        .options(
            selectinload(FormResponse.form).selectinload(Form.author),
            selectinload(FormResponse.form).selectinload(Form.game),
            selectinload(FormResponse.sender),
            selectinload(FormResponse.messages),
        )
        .join(Form, FormResponse.form_id == Form.id)
        .filter(or_(Form.author_id == current_user.id, FormResponse.sender_id == current_user.id))
        .all()
    )

    items: list[ThreadListItem] = []
    for resp in responses:
        is_author = resp.form.author_id == current_user.id
        counterparty = resp.sender if is_author else resp.form.author

        items.append(
            ThreadListItem(
                response_id=resp.id,
                form_id=resp.form_id,
                form_game_name=resp.form.game.name if resp.form.game else "",
                form_game_header=resp.form.game.header_image if resp.form.game else None,
                counterparty=FormAuthor.model_validate(counterparty),
                my_role="author" if is_author else "responder",
                started_at=resp.created_at,
                messages_count=1 + len(resp.messages),
            )
        )

    items.sort(key=lambda x: x.started_at, reverse=True)
    return items


@router.get("/{response_id}", response_model=ThreadDetail)
def get_thread(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThreadDetail:
    response = _load_response(db, response_id)
    is_author, is_responder = _check_access(response, current_user)
    if not (is_author or is_responder):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа к диалогу")

    # стартовое сообщение от sender'а отклика
    messages: list[ChatMessage] = [
        ChatMessage(
            id=0,
            text=response.message,
            created_at=response.created_at,
            sender_id=response.sender_id,
        )
    ]
    for m in sorted(response.messages, key=lambda x: x.created_at):
        messages.append(
            ChatMessage(
                id=m.id,
                text=m.text,
                created_at=m.created_at,
                sender_id=m.sender_id,
            )
        )

    return ThreadDetail(
        response_id=response.id,
        form_id=response.form_id,
        form_game_name=response.form.game.name if response.form.game else "",
        form_status=response.form.status,
        author=FormAuthor.model_validate(response.form.author),
        responder=FormAuthor.model_validate(response.sender),
        messages=messages,
        started_at=response.created_at,
    )


@router.post("/{response_id}/messages", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
def send_message(
    response_id: int,
    payload: ThreadMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatMessage:
    response = _load_response(db, response_id)
    is_author, is_responder = _check_access(response, current_user)
    if not (is_author or is_responder):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа к диалогу")

    msg = ResponseMessage(
        response_id=response.id,
        sender_id=current_user.id,
        text=payload.text.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ChatMessage(
        id=msg.id,
        text=msg.text,
        created_at=msg.created_at,
        sender_id=msg.sender_id,
    )
