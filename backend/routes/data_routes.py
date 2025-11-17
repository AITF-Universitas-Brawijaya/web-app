from fastapi import APIRouter, HTTPException
from utils.csv_parser import parse_csv
from stores.overrides_store import overrides
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/api/data", tags=["data"])

CSV_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "links.csv"

# Helper untuk ambil kolom tanpa peduli huruf besar kecil
def get_case_insensitive(row, *keys):
    for k in row.keys():
        if k.lower() in [key.lower() for key in keys]:
            return row[k]
    return ""

@router.get("/")
def get_all_data():
    try:
        records = parse_csv(str(CSV_PATH))
        formatted = []
        for i, row in enumerate(records):
            formatted.append({
                "id": i + 1,
                "link": get_case_insensitive(row, "link", "url"), 
                "jenis": row.get("jenis", "Judi"),
                "kepercayaan": float(row.get("kepercayaan") or 90),
                "status": row.get("status", "unverified"),
                "tanggal": row.get("tanggal") or datetime.utcnow().date().isoformat(),
                "lastModified": row.get("lastmodified") or datetime.utcnow().date().isoformat(),
                "reasoning": row.get("reasoning") or "-",
                "reasoningadmin": row.get("reasoningadmin"),
                "image": row.get("image") or "",
                "flagged": str(row.get("flagged")).lower() == "true"
            })

        # Apply overrides (patch sementara)
        merged = [
            {**item, **overrides.get(item["id"], {})} for item in formatted
        ]
        return merged
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading CSV: {e}")

@router.get("/{id}")
def get_data_by_id(id: int):
    data = get_all_data()
    for item in data:
        if item["id"] == id:
            return item
    raise HTTPException(status_code=404, detail="Not found")
