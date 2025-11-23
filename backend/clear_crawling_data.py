"""
Script to clear all generated domain data from the database.
This will delete all records from generated_domains and related tables.
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DB_URL", "postgresql://postgres:root@localhost:5432/prd")
engine = create_engine(DATABASE_URL)

def clear_crawling_data():
    """Clear all generated domain data from database."""
    try:
        with engine.begin() as conn:
            # Delete from tables in correct order (child tables first due to foreign keys)
            print("Deleting from results table...")
            result = conn.execute(text("DELETE FROM results"))
            print(f"  Deleted {result.rowcount} records from results")
            
            print("Deleting from object_detection table...")
            result = conn.execute(text("DELETE FROM object_detection"))
            print(f"  Deleted {result.rowcount} records from object_detection")
            
            print("Deleting from reasoning table...")
            result = conn.execute(text("DELETE FROM reasoning"))
            print(f"  Deleted {result.rowcount} records from reasoning")
            
            print("Deleting from generated_domains table...")
            result = conn.execute(text("DELETE FROM generated_domains"))
            print(f"  Deleted {result.rowcount} records from generated_domains")
            
            # Reset sequences to start from 1
            print("\nResetting ID sequences...")
            conn.execute(text("ALTER SEQUENCE generated_domains_id_domain_seq RESTART WITH 1"))
            conn.execute(text("ALTER SEQUENCE reasoning_id_reasoning_seq RESTART WITH 1"))
            conn.execute(text("ALTER SEQUENCE object_detection_id_detection_seq RESTART WITH 1"))
            conn.execute(text("ALTER SEQUENCE results_id_results_seq RESTART WITH 1"))
            print("  Sequences reset to 1")
            
        print("\n✅ All generated domain data cleared successfully!")
        print("Database is now empty and ready for new domain generation data.")
        
    except Exception as e:
        print(f"\n❌ Error clearing data: {str(e)}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("CLEAR GENERATED DOMAIN DATA")
    print("=" * 60)
    print("\nThis will delete ALL data from:")
    print("  - generated_domains")
    print("  - reasoning")
    print("  - object_detection")
    print("  - results")
    print("\nAnd reset all ID sequences to start from 1.")
    print("=" * 60)
    
    confirm = input("\nAre you sure you want to continue? (yes/no): ")
    
    if confirm.lower() == "yes":
        clear_crawling_data()
    else:
        print("\nOperation cancelled.")
