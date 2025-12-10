import os
import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path

DB_URL = os.getenv("DB_URL", "postgresql://postgres:root@localhost:5432/prd")
engine = create_engine(DB_URL)

csv_path = Path("public/data/links.csv")
if not csv_path.exists():
    raise SystemExit(f"CSV not found: {csv_path}")

df = pd.read_csv(csv_path)

df = df.rename(columns={'URL': 'url', 'Url': 'url', 'link': 'url', 'Title': 'title', 'Paragraph': 'description'})

print("Columns in dataframe:", df.columns.tolist())
print("Sample rows:\n", df.head())

df["url"] = df["url"].astype(str).fillna("").str.strip()
df = df[df["url"] != ""].drop_duplicates(subset=["url"])

with engine.begin() as conn:
    df[["url"]].to_sql("results", conn, if_exists="append", index=False, chunksize=500)

print("Import complete — data dari links.csv sudah masuk ke tabel results.")
