# backend/store/overrides_store.py
overrides = {}

def apply_override(id: int, patch: dict):
    prev = overrides.get(id, {})
    overrides[id] = {**prev, **patch}
    print("apply_override:", id, patch)
