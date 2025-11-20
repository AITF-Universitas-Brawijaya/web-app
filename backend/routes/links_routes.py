from fastapi import APIRouter
from utils.csv_parser import parse_csv
from pathlib import Path

router = APIRouter(prefix="/api/links", tags=["links"])

CSV_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "links.csv"

@router.get("/")
def get_links():
    data = parse_csv(str(CSV_PATH))
    return data
