from utils.auth import get_password_hash
from db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    new_hash = get_password_hash("secret")
    print(f"New hash for 'secret': {new_hash}")
    
    # Update admin password
    db.execute(text("UPDATE users SET password_hash = :h WHERE username = 'admin'"), {"h": new_hash})
    db.commit()
    print("Admin password updated to 'secret'")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
