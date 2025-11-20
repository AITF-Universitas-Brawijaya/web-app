# backend/store/history_store.py
from datetime import datetime

history_store = {}

def get_history(id: int):
    return history_store.get(id, [])

def ensure_init(id: int):
    if id not in history_store:
        history_store[id] = [{"time": datetime.utcnow().isoformat(), "text": "Added by crawling"}]

def add_history(id: int, text: str):
    events = history_store.get(id, [])
    events.append({"time": datetime.utcnow().isoformat(), "text": text})
    history_store[id] = events
