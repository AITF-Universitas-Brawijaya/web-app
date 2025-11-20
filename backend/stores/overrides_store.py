from sqlalchemy import text
from db import engine

def apply_override(id_result: int, patch: dict):
    allowed_map = {
        "status": "status",
        "flagged": "flagged",
    }

    updates = []
    params = {"id": id_result}
    i = 0
    for k, v in patch.items():
        if k not in allowed_map:
            continue
        col = allowed_map[k]
        updates.append(f"{col} = :p{i}")
        params[f"p{i}"] = v
        i += 1

    if not updates:
        return

    query = text(f"""
        UPDATE results
        SET {', '.join(updates)}, updated_at = now()
        WHERE id_result = :id
    """)
    with engine.begin() as conn:
        conn.execute(query, params)

    print("[DEBUG] running update:", query, params)


    print(f"[DB] Updated results id={id_result} -> {patch}")
