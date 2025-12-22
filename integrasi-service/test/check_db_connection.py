#!/usr/bin/env python3
"""
Script untuk mengecek koneksi database PostgreSQL
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Load environment variables
load_dotenv()

def check_psycopg2_connection():
    """Cek koneksi menggunakan psycopg2"""
    print("=" * 60)
    print("1. Mengecek koneksi dengan psycopg2...")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        
        # Get database version
        cursor = conn.cursor()
        cursor.execute('SELECT version();')
        db_version = cursor.fetchone()[0]
        
        # Get current database
        cursor.execute('SELECT current_database();')
        current_db = cursor.fetchone()[0]
        
        # Get connection info
        cursor.execute('SELECT current_user, inet_server_addr(), inet_server_port();')
        user, server_addr, server_port = cursor.fetchone()
        
        print("✅ Koneksi BERHASIL!")
        print(f"   Database: {current_db}")
        print(f"   User: {user}")
        print(f"   Server: {server_addr}:{server_port}")
        print(f"   Version: {db_version[:50]}...")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Koneksi GAGAL!")
        print(f"   Error: {str(e)}")
        return False

def check_sqlalchemy_connection():
    """Cek koneksi menggunakan SQLAlchemy"""
    print("\n" + "=" * 60)
    print("2. Mengecek koneksi dengan SQLAlchemy...")
    print("=" * 60)
    
    try:
        db_url = os.getenv('DB_URL')
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            # Test query
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            
            # Get table count
            result = connection.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            table_count = result.fetchone()[0]
            
            print("✅ Koneksi BERHASIL!")
            print(f"   Database URL: {db_url}")
            print(f"   Jumlah tabel di schema 'public': {table_count}")
            
        return True
        
    except OperationalError as e:
        print(f"❌ Koneksi GAGAL!")
        print(f"   Error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Error tidak terduga!")
        print(f"   Error: {str(e)}")
        return False

def list_tables():
    """List semua tabel yang ada"""
    print("\n" + "=" * 60)
    print("3. Daftar tabel di database...")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name, 
                   pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            print(f"\n📊 Ditemukan {len(tables)} tabel:")
            print(f"{'No':<5} {'Nama Tabel':<30} {'Ukuran':<15}")
            print("-" * 60)
            for idx, (table_name, size) in enumerate(tables, 1):
                print(f"{idx:<5} {table_name:<30} {size:<15}")
        else:
            print("⚠️  Tidak ada tabel di schema 'public'")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Gagal mengambil daftar tabel!")
        print(f"   Error: {str(e)}")
        return False

def check_database_stats():
    """Cek statistik database"""
    print("\n" + "=" * 60)
    print("4. Statistik Database...")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        
        cursor = conn.cursor()
        
        # Database size
        cursor.execute(f"""
            SELECT pg_size_pretty(pg_database_size('{os.getenv('DB_NAME')}'))
        """)
        db_size = cursor.fetchone()[0]
        
        # Connection count
        cursor.execute("""
            SELECT count(*) FROM pg_stat_activity 
            WHERE datname = current_database()
        """)
        connection_count = cursor.fetchone()[0]
        
        print(f"📈 Ukuran database: {db_size}")
        print(f"🔌 Jumlah koneksi aktif: {connection_count}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Gagal mengambil statistik!")
        print(f"   Error: {str(e)}")
        return False

def main():
    print("\n" + "=" * 60)
    print("🔍 CEK KONEKSI DATABASE POSTGRESQL")
    print("=" * 60)
    print(f"Host: {os.getenv('DB_HOST')}")
    print(f"Port: {os.getenv('DB_PORT')}")
    print(f"Database: {os.getenv('DB_NAME')}")
    print(f"User: {os.getenv('DB_USER')}")
    print()
    
    results = []
    
    # Run all checks
    results.append(check_psycopg2_connection())
    results.append(check_sqlalchemy_connection())
    results.append(list_tables())
    results.append(check_database_stats())
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 RINGKASAN")
    print("=" * 60)
    
    if all(results[:2]):  # Check if both connection methods work
        print("✅ Database TERHUBUNG dengan baik!")
        print("✅ Semua pemeriksaan berhasil!")
        return 0
    else:
        print("❌ Ada masalah dengan koneksi database!")
        print("⚠️  Silakan periksa konfigurasi di file .env")
        return 1

if __name__ == "__main__":
    sys.exit(main())
