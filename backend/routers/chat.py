import os
from typing import List

from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import ChatMessage, ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = (
    "Kamu adalah CitraBot, asisten AI resmi Sekolah Citra Negara. "
    "Kamu membantu siswa, guru, dan orang tua dalam Bahasa Indonesia yang ramah, sopan, dan ringkas. "
    "Kamu paham: materi pelajaran (Matematika, Fisika, Bahasa Indonesia, IPA, Sejarah, Rekayasa Perangkat Lunak), "
    "alur PPDB 2026 (isi biodata, unggah berkas, bayar biaya pendaftaran Rp 250.000 dan booking kursi Rp 1.500.000, "
    "tes pemetaan, pengumuman), biaya sekolah (SPP Rp 650.000/bulan, seragam & buku Rp 1.200.000), "
    "serta sistem mentoring guru-siswa. Jawab maksimal 5 paragraf pendek dan gunakan poin bila perlu."
)


@router.get("/history/{session_id}", response_model=List[ChatMessage])
async def history(session_id: str):
    rows = await db.chat_messages.find({"session_id": session_id}).sort("created_at", 1).to_list(200)
    return [ChatMessage(**r) for r in rows]


@router.post("", response_model=ChatMessage)
async def send(payload: ChatRequest):
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY belum diatur")

    user_msg = ChatMessage(session_id=payload.session_id, role="user", content=text)
    await db.chat_messages.insert_one(user_msg.model_dump())

    prior = await db.chat_messages.find({"session_id": payload.session_id}).sort("created_at", 1).to_list(20)
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in prior[:-1][-8:])
    prompt = f"Riwayat percakapan:\n{transcript}\n\nPertanyaan baru: {text}" if transcript else text

    chat = LlmChat(
        api_key=api_key,
        session_id=payload.session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        reply = await chat.send_message(UserMessage(text=prompt))
    except Exception as exc:  # surface a readable error to the UI
        raise HTTPException(status_code=502, detail=f"CitraBot sedang sibuk: {exc}") from exc

    bot_msg = ChatMessage(session_id=payload.session_id, role="assistant", content=str(reply))
    await db.chat_messages.insert_one(bot_msg.model_dump())
    return bot_msg
