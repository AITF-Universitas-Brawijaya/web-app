#!/usr/bin/env python3
"""
Script untuk mengubah password admin
Usage: python3 change_admin_password.py <new_password>
"""

import sys
import bcrypt
import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def get_db_connection():
    """Membuat koneksi ke database PostgreSQL"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'phishing_detection'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )

def hash_password(password: str) -> str:
    """Generate bcrypt hash untuk password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def update_admin_password(new_password: str):
    """Update password admin di database"""
    try:
        # Generate hash untuk password baru
        password_hash = hash_password(new_password)
        print(f"Generated hash: {password_hash}")
        
        # Koneksi ke database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update password
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE username = 'admin'",
            (password_hash,)
        )
        
        # Commit perubahan
        conn.commit()
        
        # Verifikasi update
        cursor.execute("SELECT username, password_hash FROM users WHERE username = 'admin'")
        result = cursor.fetchone()
        
        if result:
            print(f"\n✅ Password admin berhasil diubah!")
            print(f"Username: {result[0]}")
            print(f"New Password Hash: {result[1]}")
            print(f"\nSekarang Anda bisa login dengan:")
            print(f"  Username: admin")
            print(f"  Password: {new_password}")
        else:
            print("❌ User admin tidak ditemukan!")
        
        # Tutup koneksi
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def main():
    # Jika tidak ada argumen, minta input dari user
    if len(sys.argv) == 1:
        import getpass
        print("=== Ubah Password Admin ===")
        print()
        new_password = getpass.getpass("Masukkan password baru untuk admin: ")
        confirm_password = getpass.getpass("Konfirmasi password baru: ")
        
        if new_password != confirm_password:
            print("❌ Password tidak cocok!")
            sys.exit(1)
        
        if len(new_password) < 6:
            print("❌ Password harus minimal 6 karakter!")
            sys.exit(1)
    
    # Jika ada argumen, gunakan argumen sebagai password
    elif len(sys.argv) == 2:
        new_password = sys.argv[1]
        
        if len(new_password) < 6:
            print("❌ Password harus minimal 6 karakter!")
            sys.exit(1)
    
    # Jika argumen lebih dari 1, tampilkan usage
    else:
        print("Usage: python3 change_admin_password.py [new_password]")
        print("Example: python3 change_admin_password.py secret123")
        print("Or run without arguments for interactive mode")
        sys.exit(1)
    
    print(f"\nMengubah password admin...")
    update_admin_password(new_password)

if __name__ == "__main__":
    main()
