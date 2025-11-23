import os
import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path
from urllib.parse import urlparse

DB_URL = os.getenv("DB_URL", "postgresql://postgres:root@localhost:5432/prd")
engine = create_engine(DB_URL)

csv_path = Path("public/data/links.csv")
if not csv_path.exists():
    raise SystemExit(f"CSV not found: {csv_path}")

df = pd.read_csv(csv_path)
df = df.rename(columns={'URL': 'url', 'Url': 'url', 'link': 'url', 'Title': 'title', 'Paragraph': 'description'})

print("Columns in dataframe:", df.columns.tolist())
print(f"Total rows: {len(df)}")

df["url"] = df["url"].astype(str).fillna("").str.strip()
df = df[df["url"] != ""].drop_duplicates(subset=["url"])

print(f"After cleaning: {len(df)} rows")

with engine.begin() as conn:
    # First, insert into generated_domains
    for idx, row in df.iterrows():
        url = row.get("url", "")
        title = row.get("title", "")[:255] if pd.notna(row.get("title")) else ""
        
        # Extract domain from URL
        parsed_url = urlparse(url)
        domain = parsed_url.netloc if parsed_url.netloc else None
        
        status = 'processed' # Maintain original status
        
        # Insert into generated_domains
        result = conn.execute(text("""
            INSERT INTO generated_domains (url, title, domain, status)
            VALUES (:url, :title, :domain, :status)
            RETURNING id_domain
        """), {"url": url, "title": title, "domain": domain, "status": status})
        
        id_domain = result.fetchone()[0]
        
        # Insert into results with the generated_domains id
        conn.execute(text("""
            INSERT INTO results (
                id_domain, url, keywords, reasoning_text, 
                label_final, final_confidence, status, flagged
            )
            VALUES (
                :id_domain, :url, 'judi online', 
                'Situs terdeteksi mengandung konten perjudian online berdasarkan analisis URL dan konten.',
                true, 0.85, 'unverified', false
            )
        """), {"id_domain": id_domain, "url": url})
        
        if (idx + 1) % 50 == 0:
            print(f"Processed {idx + 1} rows...")

print(f"✅ Import complete — {len(df)} records inserted into database")
