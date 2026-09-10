from fastapi import APIRouter, HTTPException, Request, Response

from lib.db import db
from models.schemas import LoginRequest, User

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_PASSWORD = "citra123"
COOKIE = "citra_sid"


@router.post("/login", response_model=User)
async def login(payload: LoginRequest, response: Response):
    doc = await db.users.find_one({"email": payload.email.strip().lower()})
    if not doc or payload.password != DEMO_PASSWORD:
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    user = User(**doc)
    response.set_cookie(COOKIE, user.id, httponly=True, samesite="lax", path="/", max_age=60 * 60 * 24 * 7)
    return user


@router.get("/me", response_model=User)
async def me(request: Request):
    sid = request.cookies.get(COOKIE)
    if not sid:
        raise HTTPException(status_code=401, detail="Belum masuk")
    doc = await db.users.find_one({"id": sid})
    if not doc:
        raise HTTPException(status_code=401, detail="Sesi tidak valid")
    return User(**doc)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}
