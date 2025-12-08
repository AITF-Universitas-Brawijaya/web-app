import os
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
from sqlalchemy import create_engine, text

# =========================
# DATABASE CONFIG
# =========================
DB_URL = os.getenv("DB_URL", "postgresql://postgres:rosa@localhost:5432/prd")
engine = create_engine(DB_URL)

# =========================
# HELPER: EXTRACT DOMAIN
# =========================
def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.strip().lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""


# =========================
# LOAD CSV
# =========================
csv_path = Path("public/data/links.csv")
if not csv_path.exists():
    raise SystemExit(f"CSV not found: {csv_path}")

df = pd.read_csv(csv_path)

# Normalisasi nama kolom
df = df.rename(
    columns={
        "URL": "url",
        "Url": "url",
        "link": "url",
        "Title": "title",
        "Paragraph": "description",
    }
)

print("Columns in dataframe:", df.columns.tolist())
print("Sample rows:\n", df.head())

# =========================
# CLEANING URL
# =========================
df["url"] = df["url"].astype(str).fillna("").str.strip()
df = df[df["url"] != ""].drop_duplicates(subset=["url"])

if df.empty:
    print("No valid URL rows to import. Aborting.")
    raise SystemExit(0)

# =========================
# BUILD DOMAIN COLUMN
# =========================
df["domain"] = df["url"].apply(extract_domain)
df = df[df["domain"] != ""]

if df.empty:
    print("No valid domain extracted. Aborting.")
    raise SystemExit(0)

unique_domains = sorted(df["domain"].unique())
print(f"Found {len(unique_domains)} unique domains.")

# =========================
# INSERT KE generated_domains
# =========================
with engine.begin() as conn:
    # domain unik dari CSV
    domains_payload = [{"domain": d} for d in unique_domains]

    # TIDAK pakai ON CONFLICT lagi, karena kolom domain bukan UNIQUE di DB
    conn.execute(
        text(
            """
            INSERT INTO generated_domains (domain)
            VALUES (:domain)
            """
        ),
        domains_payload,
    )

    # Ambil mapping domain -> id_domain
    rows = conn.execute(
        text("SELECT id_domain, domain FROM generated_domains")
    ).fetchall()

    domain_to_id = {row.domain: row.id_domain for row in rows}

    # Map ke df
    df["id_domain"] = df["domain"].map(domain_to_id)
    df = df[df["id_domain"].notnull()]

    if df.empty:
        print("After mapping domain to id_domain, no rows left. Aborting.")
        raise SystemExit(0)

    # Siapkan data untuk results
    df_to_insert = df[["id_domain", "url"]].drop_duplicates()

    print(
        f"Inserting {len(df_to_insert)} rows into 'results' "
        f"(with valid foreign keys to generated_domains)."
    )

    df_to_insert.to_sql(
        "results",
        conn,
        if_exists="append",
        index=False,
        chunksize=500,
    )

print("Import complete — data dari links.csv sudah masuk ke tabel results dengan id_domain yang valid.")
