"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
    ],
    "documents": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("type", ASCENDING), ("created_at", DESCENDING)], name="type_created"),
        IndexModel([("subject", ASCENDING)], name="subject"),
    ],
    "submissions": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("document_id", ASCENDING), ("submitted_at", DESCENDING)], name="doc_submitted"),
    ],
    "ppdb": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "invoices": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("payer_ref", ASCENDING), ("created_at", DESCENDING)], name="payer_created"),
        IndexModel([("session_id", ASCENDING)], name="session_id"),
    ],
    "mentors": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "mentoring_sessions": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("student_id", ASCENDING), ("created_at", DESCENDING)], name="student_created"),
        IndexModel([("mentor_id", ASCENDING), ("created_at", DESCENDING)], name="mentor_created"),
    ],
    "chat_messages": [
        IndexModel([("session_id", ASCENDING), ("created_at", ASCENDING)], name="session_created"),
    ],
    "payment_transactions": [
        IndexModel([("session_id", ASCENDING)], name="session_id", unique=True),
    ],
    "levels": [IndexModel([("code", ASCENDING)], name="code", unique=True)],
    "grades": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("student_id", ASCENDING), ("created_at", ASCENDING)], name="student_created"),
    ],
    "social_posts": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
        IndexModel([("diajukan_oleh_id", ASCENDING)], name="diajukan_oleh"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
