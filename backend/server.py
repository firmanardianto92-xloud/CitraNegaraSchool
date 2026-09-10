import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from lib.db import client, ensure_indexes  # noqa: E402
from routers import auth, chat, documents, mentoring, payments, ppdb, webhook  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())
    yield
    client.close()


app = FastAPI(lifespan=lifespan, title="LMS Citra Negara")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "LMS Citra Negara API", "status": "ok"}


api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(ppdb.router)
api_router.include_router(payments.router)
api_router.include_router(mentoring.router)
api_router.include_router(chat.router)
api_router.include_router(webhook.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include the router in the main app — must stay last.
app.include_router(api_router)
