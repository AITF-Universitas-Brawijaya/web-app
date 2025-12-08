from datetime import datetime
from sqlalchemy import text
from backend.db import engine

with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS history_log (
            id SERIAL PRIMARY KEY,
            id_result INT NOT NULL,
            time TIMESTAMPTZ DEFAULT now(),
            text TEXT NOT NULL
        );
    """))

def add_history(id_result: int, text_log: str, db=None):
    """Tambah entri history ke DB (id_result mengacu ke results.id_results)"""
    sql = text("INSERT INTO history_log (id_result, text, time) VALUES (:id, :text, now())")
    if db:
        db.execute(sql, {"id": id_result, "text": text_log})
    else:
        with engine.begin() as conn:
            conn.execute(sql, {"id": id_result, "text": text_log})

def get_history(id_result: int):
    """Ambil daftar history dari DB"""
    sql = text("SELECT time, text FROM history_log WHERE id_result = :id ORDER BY time ASC")
    with engine.connect() as conn:
        rows = conn.execute(sql, {"id": id_result}).fetchall()
        return [dict(r._mapping) for r in rows]

def ensure_init(id_result: int):
    """Tambahkan entri default kalau belum ada"""
    history = get_history(id_result)
    if not history:
        add_history(id_result, "Added to results")
