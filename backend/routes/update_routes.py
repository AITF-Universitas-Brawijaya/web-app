from fastapi import APIRouter, HTTPException, Request
from stores.overrides_store import apply_override
from stores.history_store import add_history

router = APIRouter(prefix="/api/update", tags=["update"])

@router.post("/")
async def update_item(request: Request):
    body = await request.json()
    id = int(body.get("id", 0))
    patch = body.get("patch", {})
    if not id or not isinstance(patch, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    apply_override(id, patch)

    # Logging perubahan ke history
    if "flagged" in patch:
        add_history(id, "Flagged" if patch["flagged"] else "Unflagged")
    if "status" in patch:
        if patch["status"] == "verified":
            add_history(id, "Updated to Verified")
        elif patch["status"] == "unverified":
            add_history(id, "Changed to Unverified")
        elif patch["status"] == "false-positive":
            add_history(id, "Marked as False Positive")

    return {"ok": True}
