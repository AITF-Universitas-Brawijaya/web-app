import os
import psycopg2
from backend.auth import get_password_hash
from dotenv import load_dotenv
import traceback

load_dotenv()

DB_URL = os.getenv("DB_URL", "postgresql://postgres:root@localhost:5432/dbprd")

def populate_data():
    """
    Populate the database with test user and dummy data.
    This script is for development/testing purposes only.
    """
    conn = None
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT id_user FROM app_users WHERE email = 'test@example.com'")
        row = cur.fetchone()
        
        if row:
            user_id = row[0]
            print(f"Test user 'test@example.com' already exists (ID: {user_id}).")
        else:
            print("Creating test user...")
            password_hash = get_password_hash("password123")
            cur.execute(
                "INSERT INTO app_users (email, password_hash) VALUES (%s, %s) RETURNING id_user",
                ('test@example.com', password_hash)
            )
            user_id = cur.fetchone()[0]
            print(f"Test user 'test@example.com' created (ID: {user_id}).")

        cur.execute(f"SET app.current_user_id = '{user_id}'")
        print(f"RLS context set to user_id: {user_id}")

        print("Inserting dummy domains...")
        
        print("Inserting domain 1...")
        cur.execute(
            "INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_domain",
            ('https://situs-judi-online.com', 'Situs Judi Online Terpercaya', 'situs-judi-online.com', '/screenshots/dummy1.png', 'verified', True, user_id)
        )
        id_domain_1 = cur.fetchone()[0]
        print(f"Domain 1 inserted with ID: {id_domain_1}")

        cur.execute(
            "INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version, user_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (id_domain_1, True, 'Website ini menampilkan konten perjudian online dengan berbagai permainan kasino.', 0.985, 'gpt-4-turbo', user_id)
        )

        cur.execute(
            "INSERT INTO object_detection (id_detection, id_domain, label, confidence_score, image_detected_path, bounding_box, ocr, model_version, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (f'det_{id_domain_1}', id_domain_1, True, 0.955, '/detections/dummy1_detected.png', '{"boxes": []}', '{"text": ["BONUS 100%", "SLOT GACOR"]}', 'yolov8', user_id)
        )

        cur.execute(
            "INSERT INTO results (id_domain, url, keywords, reasoning_text, image_final_path, label_final, final_confidence, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (id_domain_1, 'https://situs-judi-online.com', 'judi, casino, slot, taruhan', 'Website judi online terverifikasi.', '/results/dummy1_final.png', True, 0.973, user_id)
        )

        print("Inserting domain 2...")
        cur.execute(
            "INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_domain",
            ('https://legitimate-ecommerce.com', 'Toko Online Resmi', 'legitimate-ecommerce.com', '/screenshots/dummy2.png', 'false-positive', True, user_id)
        )
        id_domain_2 = cur.fetchone()[0]
        print(f"Domain 2 inserted with ID: {id_domain_2}")

        cur.execute(
            "INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version, user_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (id_domain_2, False, 'Website e-commerce legitimate dengan sistem pembayaran resmi.', 0.125, 'gpt-4-turbo', user_id)
        )

        cur.execute(
            "INSERT INTO results (id_domain, url, keywords, reasoning_text, image_final_path, label_final, final_confidence, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (id_domain_2, 'https://legitimate-ecommerce.com', 'ecommerce, toko online', 'Bukan situs berbahaya.', '/results/dummy2_final.png', False, 0.138, user_id)
        )

        print("Inserting domain 3...")
        cur.execute(
            "INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_domain",
            ('https://adult-content-site.xxx', 'Adult Entertainment Portal', 'adult-content-site.xxx', '/screenshots/dummy3.png', 'unverified', True, user_id)
        )
        id_domain_3 = cur.fetchone()[0]
        print(f"Domain 3 inserted with ID: {id_domain_3}")

        cur.execute(
            "INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version, user_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (id_domain_3, True, 'Situs mengandung konten dewasa eksplisit.', 0.965, 'gpt-4-turbo', user_id)
        )

        cur.execute(
            "INSERT INTO object_detection (id_detection, id_domain, label, confidence_score, image_detected_path, bounding_box, ocr, model_version, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (f'det_{id_domain_3}', id_domain_3, True, 0.923, '/detections/dummy3_detected.png', '{"boxes": []}', '{"text": ["18+", "ADULT ONLY"]}', 'yolov8-nsfw', user_id)
        )

        cur.execute(
            "INSERT INTO results (id_domain, url, keywords, reasoning_text, image_final_path, label_final, final_confidence, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (id_domain_3, 'https://adult-content-site.xxx', 'pornografi, dewasa, adult, nsfw', 'Situs pornografi terdeteksi.', '/results/dummy3_final.png', True, 0.944, user_id)
        )

        conn.commit()
        cur.close()

        print("\nDummy data inserted successfully!")
        print(f"Created/used user: test@example.com (ID: {user_id})")
        print(f"Inserted 3 domains with full analysis data")
        print(f"\nLogin credentials:")
        print(f"Email: test@example.com")
        print(f"Password: password123")
        
    except Exception as e:
        if conn:
            conn.rollback()
        with open("error.log", "w") as f:
            traceback.print_exc(file=f)
        print(f"Error occurred: {e}")
        print("Check error.log for details")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    populate_data()
