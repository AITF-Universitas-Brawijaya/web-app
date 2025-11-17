from fastapi import APIRouter, HTTPException, Form
from stores.history_store import get_history, add_history, ensure_init

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/")
def get_history_data(id: int):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    ensure_init(id)
    return {"events": get_history(id)}

@router.post("/")
def post_history_entry(id: int = Form(...), text: str = Form(...)):
    add_history(id, text)
    return {"ok": True}

