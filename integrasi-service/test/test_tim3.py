# =========================
# api_final.py
# Scraper lokal + reasoning LLM eksternal
# =========================

import time
import json
import re
import requests
from datetime import datetime

# =========================
# CONFIG LLM
# =========================
VLLM_BASE_URL = "http://202.79.101.81:52988/v1"
MODEL_NAME = "prdreasoning"
SYSTEM_PROMPT = """Tugas: Klasifikasikan apakah konten ini adalah SITUS JUDI atau BUKAN SITUS JUDI.

DEFINISI:
1. "judi" = SITUS JUDI: Konten yang mempromosikan / menyediakan / mengajak bermain judi
2. "non_judi" = Semua konten lain (berita, edukasi, resep, dll)

JAWAB DALAM FORMAT JSON:
{
  "label": "judi" atau "non_judi",
  "reasoning": "Alasan singkat",
  "confidence": 0.95
}
"""
TEMPERATURE = 0.2
MAX_TOKENS = 600

# =========================
# UTILITY
# =========================
def strip_think(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

def safe_json_parse(text: str):
    cleaned = strip_think(text)
    cleaned = re.sub(r"```json|```", "", cleaned).strip()
    try:
        return True, json.loads(cleaned)
    except:
        return False, cleaned

# =========================
# SCRAPER LOCAL (DIRECT)
# =========================
def scrape_website(url: str, timeout: int = 60):
    from bs4 import BeautifulSoup
    
    start_time = time.perf_counter()
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        # Use a shorter timeout for the request itself
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # Extract Data
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        
        description = ""
        meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
        if meta_desc:
            description = meta_desc.get('content', '').strip()
            
        keywords = ""
        meta_keys = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keys:
            keywords = meta_keys.get('content', '').strip()
            
        paragraphs = [p.get_text(strip=True) for p in soup.find_all('p') if p.get_text(strip=True)]
        
        data = {
            "Scraped_URL": url,
            "Title": title,
            "Description": description,
            "Keywords": keywords,
        }
        
        # Add P1-P5
        for i in range(5):
            key = f"P{i+1}"
            data[key] = paragraphs[i] if i < len(paragraphs) else ""
            
        elapsed = time.perf_counter() - start_time
        data["scrape_time_sec"] = round(elapsed, 2)
        data["scrape_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return data

    except Exception as e:
        raise Exception(f"Scraping gagal: {str(e)}")

# =========================
# CALL LLM EXTERNAL
# =========================
def call_vllm(content: str):
    url = f"{VLLM_BASE_URL}/chat/completions"
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS
    }
    start_time = time.perf_counter()
    resp = requests.post(url, json=payload, timeout=120)
    resp.raise_for_status()
    elapsed = round(time.perf_counter() - start_time, 2)
    raw_text = resp.json()["choices"][0]["message"]["content"]
    ok, parsed = safe_json_parse(raw_text)
    return parsed if ok else raw_text, elapsed

# =========================
# MAIN FUNCTION
# =========================
def classify_url(url: str):
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # 1. Scrape content
    scraped = scrape_website(url)

    # 2. Combine scraped content
    blocks = [
        f"URL: {scraped.get('Scraped_URL','')}",
        f"TITLE: {scraped.get('Title','')}",
        f"DESCRIPTION: {scraped.get('Description','')}",
        f"KEYWORDS: {scraped.get('Keywords','')}",
        "\nPARAGRAPHS:"
    ]
    for i in range(1,6):
        blocks.append(scraped.get(f"P{i}", ""))
    combined_content = "\n".join(blocks)

    # 3. Call external LLM
    classification, model_time_sec = call_vllm(combined_content)

    # 4. Return full result
    return {
        "input_url": url,
        "scrape_meta": {
            "time_sec": scraped.get("scrape_time_sec"),
            "timestamp": scraped.get("scrape_timestamp")
        },
        "scraped_content": scraped,
        "classification": classification,
        "_model_time_sec": model_time_sec
    }

# =========================
# RUN EXAMPLE
# =========================
if __name__ == "__main__":
    test_url = input("Masukkan URL: ").strip()
    result = classify_url(test_url)
    print(json.dumps(result, indent=2, ensure_ascii=False))