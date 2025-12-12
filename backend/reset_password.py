from utils.auth import get_password_hash
from db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    new_hash = get_password_hash("password123")
    print(f"New hash: {new_hash}")
    
    # Update admin password
    db.execute(text("UPDATE users SET password_hash = :h WHERE username = 'admin'"), {"h": new_hash})
    db.commit()
    print("Admin password updated to 'password123'")
    
    # Verify
    result = db.execute(text("SELECT password_hash FROM users WHERE username = 'admin'"))
    stored = result.scalar()
    print(f"Stored hash: {stored}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
