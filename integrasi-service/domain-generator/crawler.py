#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Force unbuffered output for real-time streaming
import sys
import os
import re

# Reconfigure stdout and stderr to be unbuffered
if sys.stdout is not None:
    sys.stdout.reconfigure(line_buffering=False, write_through=True)
if sys.stderr is not None:
    sys.stderr.reconfigure(line_buffering=False, write_through=True)

# Monkey patch print to force flush (redundant but safe)
import builtins
_original_print = builtins.print
def print(*args, **kwargs):
    kwargs['flush'] = True
    _original_print(*args, **kwargs)

# Set environment variable for unbuffered output (backup)
os.environ['PYTHONUNBUFFERED'] = '1'

from ddgs import DDGS
import httpx
from bs4 import BeautifulSoup
import json
import argparse
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import time
from multiprocessing import Pool, cpu_count
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import requests
from playwright.sync_api import sync_playwright
import base64



# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
OUTPUT_IMG_DIR = os.path.join(OUTPUT_DIR, "img")
LAST_ID_FILE = os.path.join(OUTPUT_DIR, "last_id.txt")
ALL_DOMAINS_FILE = os.path.join(OUTPUT_DIR, "all_domains.txt")
LAST_KEYWORDS_FILE = os.path.join(OUTPUT_DIR, "last_keywords.txt")
BLOCKED_KEYWORDS_FILE = os.path.join(os.path.dirname(__file__), "blocked_keywords.txt")
BLOCKED_DOMAINS_FILE = os.path.join(OUTPUT_DIR, "..", "blocked_domains.txt")  # Relative to crawler root

# Database configuration
DATABASE_URL = os.getenv("DB_URL", "postgresql://postgres:postgres@localhost:5432/prd")
engine = create_engine(DATABASE_URL)


# Timeout configuration (in seconds)
FETCH_TIMEOUT = 10
OG_TIMEOUT = 10
SCREENSHOT_TIMEOUT = 20
DETECTION_API_TIMEOUT = 30

# Processing configuration
MAX_WORKERS_FETCH = 5
MAX_WORKERS_SCREENSHOT = max(2, cpu_count() - 1)  # Use multiple CPU cores for screenshots
MAX_WORKERS_DETECTION = 3  # Limit concurrent API calls to detection service

# Detection API configuration
# Detection API configuration
SCRAPER_API_URL = os.getenv("SCRAPER_API_URL", "http://localhost:7000/api/scrape")
DETECTION_API_URL = os.getenv("OBJ_DETECTION_URL", "http://localhost:9090/predict")
MAX_RESULT = 10  # Maximum number of valid domains to process per run
VERSION = "1.4"

# vLLM Reasoning Configuration
# VLLM_BASE_URL = "http://202.79.101.81:52988/v1"
VLLM_BASE_URL = os.getenv("REASONING_SERVICE_URL", "http://localhost:8001/v1")
VLLM_MODEL_NAME = os.getenv("VLLM_MODEL_NAME", "aitfindonesia/KomdigiUB-8B-Instruct-PRD3")

REASONING_SYSTEM_PROMPT = """Tugas: Klasifikasikan apakah konten ini adalah SITUS JUDI atau BUKAN SITUS JUDI.

DEFINISI:
1. "judi" = SITUS JUDI: Konten yang mempromosikan/menyediakan/mengajak bermain judi online/offline
   - Contoh: "Main slot bonus 100%", "Daftar di casino online", "Deposit sekarang main poker"
   - Ciri: ada ajakan bermain, bonus, link daftar, cara deposit, promosi judi

2. "non_judi" = BUKAN SITUS JUDI: Semua konten lain termasuk:
   - Berita tentang penangkapan/pemberantasan judi
   - Artikel edukasi bahaya judi
   - Laporan investigasi tentang judi
   - Konten umum: berita, resep, edukasi, bisnis, dll
   - Contoh: "Polisi tangkap bandar judi", "Judi merusak keluarga", "Resep masakan"

ANALISIS KONTEN PADA URL yang diinputkan

JAWAB DALAM FORMAT JSON INI:
{
  "label": "judi" atau "non_judi",
  "reasoning": "Penjelasan singkat",
  "confidence": 0.95
}
"""

# Global sets untuk tracking (anti-duplikasi dan blocked domains)
SEEN_DOMAINS = set()
BLOCKED_DOMAINS = set()

# Ensure output directories exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_IMG_DIR, exist_ok=True)


def get_last_id():
    """Get last ID from file or return -1 if not exists."""
    if os.path.exists(LAST_ID_FILE):
        try:
            with open(LAST_ID_FILE, "r") as f:
                return int(f.read().strip())
        except:
            return -1
    return -1


def load_seen_domains():
    """Load all previously seen domains into global set."""
    global SEEN_DOMAINS
    SEEN_DOMAINS = set()
    
    if os.path.exists(ALL_DOMAINS_FILE):
        try:
            with open(ALL_DOMAINS_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    domain = line.strip()
                    if domain:
                        SEEN_DOMAINS.add(domain)
            print(f"[INFO] Loaded {len(SEEN_DOMAINS)} existing domains")
        except Exception as e:
            print(f"[WARNING] Failed to load domains: {str(e)}")
    else:
        print(f"[INFO] No existing domains file. Starting fresh.")


def load_blocked_domains():
    """Load blocked domains from database into global set."""
    global BLOCKED_DOMAINS
    BLOCKED_DOMAINS = set()
    
    try:
        with engine.begin() as conn:
            query = text("""
                SELECT setting_value
                FROM generator_settings
                WHERE setting_key = 'blocked_domains'
            """)
            result = conn.execute(query).fetchone()
            
            if result:
                setting_value = dict(result._mapping)["setting_value"]
                if setting_value:
                    # Split by newlines and filter empty lines
                    domains = [line.strip() for line in setting_value.split('\n') if line.strip()]
                    BLOCKED_DOMAINS = set(domains)
                    print(f"[INFO] Loaded {len(BLOCKED_DOMAINS)} blocked domains from database")
                else:
                    print(f"[INFO] No blocked domains found in database")
            else:
                print(f"[INFO] No blocked domains setting in database")
    except Exception as e:
        print(f"[WARNING] Failed to load blocked domains from database: {str(e)}")
        print(f"[INFO] Continuing without blocked domains")


def load_blocked_keywords():
    """Load blocked keywords from database and return as list."""
    blocked_keywords = []
    
    try:
        with engine.begin() as conn:
            query = text("""
                SELECT setting_value
                FROM generator_settings
                WHERE setting_key = 'blocked_keywords'
            """)
            result = conn.execute(query).fetchone()
            
            if result:
                setting_value = dict(result._mapping)["setting_value"]
                if setting_value:
                    # Split by newlines and filter empty lines
                    keywords = [line.strip() for line in setting_value.split('\n') if line.strip()]
                    blocked_keywords = keywords
                    print(f"[INFO] Loaded {len(blocked_keywords)} blocked keywords from database")
                else:
                    print(f"[INFO] No blocked keywords found in database")
            else:
                print(f"[INFO] No blocked keywords setting in database")
    except Exception as e:
        print(f"[WARNING] Failed to load blocked keywords from database: {str(e)}")
        print(f"[INFO] Continuing without blocked keywords")
    
    return blocked_keywords


def save_last_keywords(keywords):
    """Save keywords list to file."""
    if not keywords:
        return
    
    try:
        with open(LAST_KEYWORDS_FILE, "w", encoding="utf-8") as f:
            f.write(", ".join(keywords))
        print(f"[INFO] Saved {len(keywords)} keywords")
    except Exception as e:
        print(f"[ERROR] Failed to save keywords: {str(e)}")


def load_last_keywords():
    """Load last used keywords from file."""
    if os.path.exists(LAST_KEYWORDS_FILE):
        try:
            with open(LAST_KEYWORDS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    keywords = [k.strip() for k in content.split(',') if k.strip()]
                    return keywords
        except Exception as e:
            print(f"[WARNING] Failed to load last keywords: {str(e)}")
    return None


def save_last_id(last_id):
    """Save the last ID to file."""
    with open(LAST_ID_FILE, "w") as f:
        f.write(str(last_id))


def extract_domain(url):
    """Extract domain from URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        return domain if domain else "unknown"
    except:
        return "unknown"


def is_domain_blocked(domain):
    """Check if domain is in blocked list."""
    if not domain or domain == "unknown":
        return False
    
    # Check if domain or any subdomain matches blocked domains
    for blocked in BLOCKED_DOMAINS:
        if blocked in domain:
            return True
    return False


def is_domain_duplicate(domain):
    """Check if domain already exists in global set."""
    return domain in SEEN_DOMAINS


def add_domain_to_set(domain):
    """Add domain to global set."""
    if domain and domain != "unknown":
        SEEN_DOMAINS.add(domain)


def save_new_domains(new_domains):
    """Append new domains to all_domains.txt file."""
    if not new_domains:
        return
    
    try:
        with open(ALL_DOMAINS_FILE, "a", encoding="utf-8") as f:
            for domain in new_domains:
                f.write(domain + "\n")
        print(f"[INFO] Saved {len(new_domains)} new domains")
    except Exception as e:
        print(f"[ERROR] Failed to save new domains: {str(e)}")



def take_screenshot_worker(url, output_path, item_id):
    """Worker function for taking screenshot (must be picklable for multiprocessing)."""
    try:
        # Essential headless arguments (kept, mapped to Playwright/Chromium args)
        chromium_args = [
            "--no-sandbox",
            "--disable-dev-shm-usage",

            # Additional stability arguments (kept)
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--window-size=1920,1080",
            "--start-maximized",
            "--log-level=3",
        ]

        user_agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,  # equivalent to --headless=new
                # executable_path=chrome_executable, # Removed: broken path
                args=chromium_args,
            )

            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=user_agent,
            )

            page = context.new_page()

            # Match Selenium-ish behavior: give navigation time to load
            page.set_default_navigation_timeout(30_000)
            page.set_default_timeout(30_000)

            page.goto(url, wait_until="load")
            time.sleep(3)  # Wait for page to fully load (kept)
            
            # Take screenshot as bytes (also saves to disk if path is provided)
            screenshot_bytes = page.screenshot(path=output_path, full_page=False)
            
            # Convert to base64
            base64_str = base64.b64encode(screenshot_bytes).decode('utf-8')

            context.close()
            browser.close()

        return True, base64_str

    except Exception as e:
        print(f"[SCREENSHOT ERROR] {item_id}: {str(e)[:100]}")
        return False, None



def take_screenshot(url, output_path, retries=2):
    """Take screenshot of the URL (no retries on timeout)."""
    try:
        chromium_args = [
            "--no-sandbox",
            "--disable-dev-shm-usage",

            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--window-size=1920,1080",
            "--start-maximized",
            "--log-level=3",
        ]

        user_agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                # executable_path=chrome_executable,
                args=chromium_args,
            )

            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=user_agent,
            )
            page = context.new_page()
            page.set_default_navigation_timeout(30_000)
            page.set_default_timeout(30_000)

            page.goto(url, wait_until="load")
            time.sleep(3)
            page.screenshot(path=output_path, full_page=False)

            context.close()
            browser.close()

        return True

    except Exception as e:
        print(f"[SCREENSHOT ERROR]: {str(e)[:100]}")
        return False


def fetch_url_data(url_item, item_index, current_id):
    """Fetch data for a single URL (without screenshot)."""
    result = {
        "id": f"{current_id:08d}",
        "title": url_item.get("title", "-"),
        "url": url_item.get("href", "-"),
        "domain": extract_domain(url_item.get("href", "-")),
        "screenshot_status": "pending",
    }

    print(f"[{item_index}] Fetched ID {current_id:08d}: {result['title'][:50]}")
    return result

def process_screenshots_parallel(all_results):
    """Process screenshots in parallel using multiprocessing."""
    print(f"\n[SCREENSHOT] Taking screenshots with {MAX_WORKERS_SCREENSHOT} processes")
    
    # Prepare screenshot tasks
    screenshot_tasks = []
    for result in all_results:
        url = result.get("url", "")
        item_id = result.get("id", "unknown")
        
        if url and url != "-":
            screenshot_path = os.path.join(OUTPUT_IMG_DIR, f"{item_id}.png")
            screenshot_tasks.append((url, screenshot_path, item_id))
    
    # Use ProcessPoolExecutor for parallel screenshot processing
    results_status = {}
    
    with ProcessPoolExecutor(max_workers=MAX_WORKERS_SCREENSHOT) as executor:
        futures = {
            executor.submit(take_screenshot_worker, url, path, item_id): item_id
            for url, path, item_id in screenshot_tasks
        }
        
        completed = 0
        for future in as_completed(futures):
            item_id = futures[future]
            try:
                success, base64_str = future.result()
                status = "success" if success else "failed"
                results_status[item_id] = {"status": status, "base64": base64_str}
                
                completed += 1
                status_symbol = "✓" if success else "✗"
                print(f"[{completed}/{len(screenshot_tasks)}] {item_id} {status_symbol}")
            except Exception as e:
                results_status[item_id] = {"status": "failed", "base64": None}
                completed += 1
                print(f"[{completed}/{len(screenshot_tasks)}] {item_id} ✗ (Exception: {str(e)[:50]})")
    
    # Update screenshot status in results
    for result in all_results:
        item_id = result.get("id", "unknown")
        if item_id in results_status:
            result["screenshot_status"] = results_status[item_id]["status"]
            result["image_base64"] = results_status[item_id]["base64"]
        else:
            result["screenshot_status"] = "skipped"
            result["image_base64"] = None


def scrape_website_direct(url, item_id):
    """Scrape website locally using BeautifulSoup."""
    try:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        resp = requests.get(url, headers=headers, timeout=30, verify=False)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, 'html.parser')
        
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
        
        for i in range(5):
            data[f"P{i+1}"] = paragraphs[i] if i < len(paragraphs) else ""
            
        return data
    except Exception as e:
        print(f"[SCRAPE LOCAL] {item_id}: ✗ {str(e)[:100]}")
        return None


def call_reasoning_llm(scraped_data, item_id):
    """Call vLLM reasoning API with scraped content."""
    try:
        # Format content to match expected structure
        url = scraped_data.get('Scraped_URL', '')
        title = scraped_data.get('Title', '')
        description = scraped_data.get('Description', '')
        keywords = scraped_data.get('Keywords', '')
        
        # Collect paragraphs
        paragraphs = []
        for i in range(1, 6):
            p = scraped_data.get(f"P{i}", "")
            if p:
                paragraphs.append(f"- {p}")
        
        # Build formatted content
        content_parts = [
            f"URL: {url}",
            "",
            f"Judul: {title}",
            "",
            f"Deskripsi: {description}",
            "",
            f"Kata kunci: {keywords}",
            "",
            "Isi artikel:"
        ]
        
        # Add paragraphs
        content_parts.extend(paragraphs)
        
        combined_content = "\n".join(content_parts)
        
        # Call vLLM API
        url = f"{VLLM_BASE_URL}/chat/completions"
        payload = {
            "model": VLLM_MODEL_NAME,
            "messages": [
                {"role": "system", "content": REASONING_SYSTEM_PROMPT},
                {"role": "user", "content": combined_content}
            ],
            "temperature": 0.2,
            "max_tokens": 600
        }
        
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        
        raw_text = response.json()["choices"][0]["message"]["content"]
        
        # Strip <think> tags and parse JSON
        cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        cleaned = re.sub(r"```json|```", "", cleaned).strip()
        
        try:
            parsed = json.loads(cleaned)
            # Add metadata
            parsed['metadata'] = {
                'model_source': VLLM_MODEL_NAME,
                'scraped_url': scraped_data.get('Scraped_URL', '')
            }
            print(f"[REASONING API] {item_id}: ✓ {parsed.get('label', 'unknown')} (confidence: {parsed.get('confidence', 0.0):.2f})")
            return parsed
        except json.JSONDecodeError:
            print(f"[REASONING API] {item_id}: ✗ Failed to parse JSON response")
            return None
            
    except requests.exceptions.Timeout:
        print(f"[REASONING API] {item_id}: ✗ Timeout after 120s")
        return None
    except requests.exceptions.ConnectionError:
        print(f"[REASONING API] {item_id}: ✗ Connection failed (is vLLM API running?)")
        return None
    except Exception as e:
        print(f"[REASONING API] {item_id}: ✗ {str(e)[:100]}")
        return None


def reasoning_workflow(url, item_id):
    """Scrape content locally and then call Reasoning LLM."""
    scraped = scrape_website_direct(url, item_id)
    if scraped:
        return call_reasoning_llm(scraped, item_id)
    return None


def send_to_detection_api(screenshot_path, item_id):
    """Send screenshot to object detection API and return response."""
    try:
        if not os.path.exists(screenshot_path):
            print(f"[DETECTION API] {item_id}: Screenshot file not found")
            return None
        
        with open(screenshot_path, 'rb') as img_file:
            files = {'file': ('screenshot.png', img_file, 'image/png')}
            response = requests.post(
                DETECTION_API_URL,
                files=files,
                timeout=DETECTION_API_TIMEOUT
            )
            
            if response.status_code == 200:
                api_response = response.json()
                if api_response.get('success'):
                    result = api_response.get('result', {})
                    status = result.get('status', 'unknown')
                    confidence = result.get('prob_fusion', 0.0)
                    print(f"[DETECTION API] {item_id}: ✓ {status} (prob_fusion: {confidence:.4f})")
                    return api_response
                else:
                    print(f"[DETECTION API] {item_id}: API returned success=false")
                    return None
            else:
                print(f"[DETECTION API] {item_id}: HTTP {response.status_code}")
                return None
                
    except requests.exceptions.Timeout:
        print(f"[DETECTION API] {item_id}: Timeout after {DETECTION_API_TIMEOUT}s")
        return None
    except requests.exceptions.ConnectionError:
        print(f"[DETECTION API] {item_id}: Connection failed (is API running on port 9090?)")
        return None
    except Exception as e:
        print(f"[DETECTION API] {item_id}: Error - {str(e)[:100]}")
        return None


def process_apis_parallel(all_results):
    """Process both detection and reasoning API calls in parallel for successful screenshots."""
    # Filter only successful screenshots
    api_tasks = []
    for result in all_results:
        if result.get('screenshot_status') == 'success':
            item_id = result.get('id', 'unknown')
            screenshot_path = os.path.join(OUTPUT_IMG_DIR, f"{item_id}.png")
            url = result.get('url', '')
            api_tasks.append((screenshot_path, url, item_id, result))
    
    if not api_tasks:
        print("[API] No successful screenshots to process")
        return
    
    print(f"\n[API] Sending {len(api_tasks)} items to both Detection and Reasoning APIs with workers")
    
    # Use ThreadPoolExecutor for API calls
    with ThreadPoolExecutor(max_workers=MAX_WORKERS_DETECTION * 2) as executor:
        futures = {}
        
        for screenshot_path, url, item_id, result in api_tasks:
            # 1. Submit Detection Task
            detection_future = executor.submit(send_to_detection_api, screenshot_path, item_id)
            futures[detection_future] = ('detection', item_id, result)
            
            # 2. Submit Reasoning Task (Local Scrape + LLM)
            reasoning_future = executor.submit(reasoning_workflow, url, item_id)
            futures[reasoning_future] = ('reasoning', item_id, result)
        
        # Collect results
        completed = 0
        total_calls = len(futures)
        
        for future in as_completed(futures):
            api_type, item_id, result = futures[future]
            try:
                api_response = future.result()
                
                if api_type == 'detection':
                    if api_response:
                        result['detection_api_response'] = api_response
                        result['detection_status'] = 'success'
                    else:
                        result['detection_status'] = 'failed'
                    status_symbol = "✓" if api_response else "✗"
                    
                elif api_type == 'reasoning':
                    if api_response:
                        result['reasoning_api_response'] = api_response
                        result['reasoning_status'] = 'success'
                    else:
                        result['reasoning_status'] = 'failed'
                    status_symbol = "✓" if api_response else "✗"
                
                completed += 1
                # Format log nicely
                if api_type == 'detection':
                     # Detection already prints its own log inside send_to_detection_api
                     pass 
                elif api_type == 'reasoning':
                     # Reasoning workflow already prints its own logs inside scrape/llm functions
                     pass

                # print(f"[{completed}/{total_calls}] {api_type.title()} {item_id} {status_symbol}")
                    
            except Exception as e:
                if api_type == 'detection':
                    result['detection_status'] = 'failed'
                elif api_type == 'reasoning':
                    result['reasoning_status'] = 'failed'
                print(f"[API ERROR] {api_type} {item_id}: {str(e)[:50]}")
    
    # Print summary
    detection_success = sum(1 for r in all_results if r.get('detection_status') == 'success')
    detection_failed = sum(1 for r in all_results if r.get('detection_status') == 'failed')
    reasoning_success = sum(1 for r in all_results if r.get('reasoning_status') == 'success')
    reasoning_failed = sum(1 for r in all_results if r.get('reasoning_status') == 'failed')
    
    print(f"[DETECTION API] Complete: {detection_success} success, {detection_failed} failed")
    print(f"[REASONING API] Complete: {reasoning_success} success, {reasoning_failed} failed")



def save_to_database(all_results, keyword, username='system'):
    """Save crawled results to database with user tracking."""
    print("[DATABASE] Starting database save...", flush=True)
    print(f"[DATABASE] Attempting to save {len(all_results)} records", flush=True)
    print(f"[DATABASE] Username: {username}", flush=True)
    
    if not all_results:
        print("[DATABASE] WARNING: No results to save!", flush=True)
        return False
    
    try:
        with engine.begin() as conn:
            saved_count = 0
            detection_saved_count = 0
            results_saved_count = 0
            failed_count = 0
            
            for idx, result in enumerate(all_results):
                try:
                    print(f"[DATABASE] Processing record {idx+1}/{len(all_results)}: {result.get('domain', 'unknown')}", flush=True)
                    
                    # Prepare image path in the format: domain-generator/output/img/<id>.png
                    # Note: result['id'] is just for file naming, not for database ID
                    screenshot_filename = result['id']
                    image_path = f"domain-generator/output/img/{screenshot_filename}.png" if result.get('screenshot_status') == 'success' else None
                    
                    # Check if domain already exists in generated_domains
                    existing_id = conn.execute(text("SELECT id_domain FROM generated_domains WHERE domain = :domain"), {"domain": result.get('domain', '')}).fetchone()
                    
                    if existing_id:
                        id_domain = existing_id[0]
                        print(f"[DATABASE] Domain already exists with id_domain={id_domain}. Using existing ID.", flush=True)
                        
                        # Update image_base64 if available
                        if result.get('image_base64'):
                             conn.execute(text("UPDATE generated_domains SET image_base64 = :image_base64 WHERE id_domain = :id_domain"), 
                                         {"image_base64": result.get('image_base64'), "id_domain": id_domain})
                             print(f"[DATABASE] Updated image_base64 for id_domain={id_domain}", flush=True)
                    else:
                        # Insert into generated_domains
                        insert_result = conn.execute(text("""
                            INSERT INTO generated_domains (url, title, domain, image_base64)
                            VALUES (:url, :title, :domain, :image_base64)
                            RETURNING id_domain
                        """), {
                            "url": result.get('url', ''),
                            "title": result.get('title', '')[:255],  # Limit to 255 chars
                            "domain": result.get('domain', ''),
                            "image_base64": result.get('image_base64')
                        })
                        id_domain = insert_result.fetchone()[0]
                        print(f"[DATABASE] Inserted into generated_domains with id_domain={id_domain}", flush=True)
                    
                    saved_count += 1
                    
                    # Prepare detection data if available
                    id_detection = None
                    label_final = None
                    final_confidence = None
                    image_detected_path = None
                    image_base64 = None  # Initialize image_base64
                    
                    # Variables to track detection and reasoning confidences for fusion
                    detection_confidence_score = None
                    reasoning_confidence_score = None
                    
                    # If detection API was successful, save to object_detection table
                    if result.get('detection_status') == 'success' and result.get('detection_api_response'):
                        api_response = result['detection_api_response']
                        api_result = api_response.get('result', {})
                        
                        # Transform data
                        status = api_result.get('status', '')
                        label = True if status == 'gambling' else False
                        label_final = label
                        
                        # Use prob_fusion as the confidence score (this is what the API actually returns)
                        confidence = api_result.get('prob_fusion', 0.0)
                        confidence_score = round(confidence * 100, 1)  # Convert to percentage (0-100)
                        detection_confidence_score = confidence_score  # Store for fusion
                        
                        # Visualization path from API contains the Base64 string
                        image_base64 = api_result.get('visualization_path', '')
                        
                        id_detection = api_result.get('id')
                        
                        # Check if detection exists for this domain
                        existing_detection = conn.execute(text("SELECT 1 FROM object_detection WHERE id_domain = :id_domain"), {"id_domain": id_domain}).fetchone()
                        
                        detection_params = {
                            "id_detection": id_detection,
                            "id_domain": id_domain,
                            "label": label,
                            "confidence_score": confidence_score,
                            "image_detected_base64": image_base64,
                            "bounding_box": json.dumps(api_result.get('detections', [])),
                            "ocr": json.dumps(api_result.get('ocr', [])),
                            "model_version": None
                        }

                        if existing_detection:
                            conn.execute(text("""
                                UPDATE object_detection SET
                                    id_detection = :id_detection,
                                    label = :label,
                                    confidence_score = :confidence_score,
                                    image_detected_base64 = :image_detected_base64,
                                    bounding_box = :bounding_box,
                                    ocr = :ocr,
                                    model_version = :model_version,
                                    processed_at = now()
                                WHERE id_domain = :id_domain
                            """), detection_params)
                        else:
                            conn.execute(text("""
                                INSERT INTO object_detection (
                                    id_detection,
                                    id_domain,
                                    label,
                                    confidence_score,
                                    image_detected_base64,
                                    bounding_box,
                                    ocr,
                                    model_version
                                ) VALUES (
                                    :id_detection,
                                    :id_domain,
                                    :label,
                                    :confidence_score,
                                    :image_detected_base64,
                                    :bounding_box,
                                    :ocr,
                                    :model_version
                                )
                            """), detection_params)
                        detection_saved_count += 1
                        print(f"[DATABASE] Inserted into object_detection", flush=True)
                    
                    # Prepare reasoning data if available
                    id_reasoning = None
                    reasoning_text = None
                    
                    # If reasoning API was successful, save to reasoning table
                    if result.get('reasoning_status') == 'success' and result.get('reasoning_api_response'):
                        reasoning_response = result['reasoning_api_response']
                        
                        # Extract data from reasoning API response
                        reasoning_label_str = reasoning_response.get('label', 'non_judi')
                        reasoning_label = True if reasoning_label_str == 'judi' else False
                        reasoning_text = reasoning_response.get('reasoning', '')
                        reasoning_confidence = reasoning_response.get('confidence', 0.0)
                        reasoning_confidence_raw = round(reasoning_confidence * 100, 1)  # Convert to percentage (0-100)
                        
                        # For reasoning: if label is non-judi, inverse the confidence
                        # This aligns reasoning confidence with gambling detection scale
                        if reasoning_label_str == 'non_judi':
                            reasoning_confidence_score = round(100 - reasoning_confidence_raw, 1)
                        else:
                            reasoning_confidence_score = reasoning_confidence_raw
                        
                        metadata = reasoning_response.get('metadata', {})
                        model_source = metadata.get('model_source', 'unknown')
                        
                        # Update label_final if not set by detection
                        if label_final is None:
                            label_final = reasoning_label
                        
                        # Insert into reasoning table
                        try:
                            # Check if reasoning exists for this domain
                            existing_reasoning = conn.execute(text("SELECT id_reasoning FROM reasoning WHERE id_domain = :id_domain"), {"id_domain": id_domain}).fetchone()
                            
                            
                            reasoning_params = {
                                "id_domain": id_domain,
                                "label": reasoning_label,
                                "context": reasoning_text,
                                "confidence_score": reasoning_confidence_score,  # Already inverted for non-judi to align with gambling scale
                                "model_version": model_source
                            }
                            
                            if existing_reasoning:
                                # UPDATE existing reasoning
                                conn.execute(text("""
                                    UPDATE reasoning SET
                                        label = :label,
                                        context = :context,
                                        confidence_score = :confidence_score,
                                        model_version = :model_version,
                                        processed_at = now()
                                    WHERE id_domain = :id_domain
                                """), reasoning_params)
                                id_reasoning = existing_reasoning[0]
                                print(f"[DATABASE] Updated reasoning with id_reasoning={id_reasoning}", flush=True)
                            else:
                                # INSERT new reasoning
                                insert_result = conn.execute(text("""
                                    INSERT INTO reasoning (
                                        id_domain,
                                        label,
                                        context,
                                        confidence_score,
                                        model_version
                                    ) VALUES (
                                        :id_domain,
                                        :label,
                                        :context,
                                        :confidence_score,
                                        :model_version
                                    )
                                    RETURNING id_reasoning
                                """), reasoning_params)
                                id_reasoning = insert_result.fetchone()[0]
                                print(f"[DATABASE] Inserted into reasoning with id_reasoning={id_reasoning}", flush=True)
                        except Exception as reasoning_error:
                            print(f"[DATABASE] Failed to insert/update reasoning: {str(reasoning_error)}", flush=True)
                    
                    # Calculate final_confidence using fusion of detection and reasoning
                    # Fusion: 50% object_detection + 50% reasoning
                    if detection_confidence_score is not None and reasoning_confidence_score is not None:
                        # Both available: 50-50 fusion
                        final_confidence = round((detection_confidence_score * 0.5) + (reasoning_confidence_score * 0.5), 1)
                        print(f"[FUSION] Detection: {detection_confidence_score}%, Reasoning: {reasoning_confidence_score}% → Final: {final_confidence}%", flush=True)
                    elif detection_confidence_score is not None:
                        # Only detection available
                        final_confidence = detection_confidence_score
                        print(f"[FUSION] Only detection available: {final_confidence}%", flush=True)
                    elif reasoning_confidence_score is not None:
                        # Only reasoning available
                        final_confidence = reasoning_confidence_score
                        print(f"[FUSION] Only reasoning available: {final_confidence}%", flush=True)
                    else:
                        # Neither available
                        final_confidence = None
                        print(f"[FUSION] No confidence data available", flush=True)
                    
                    # Insert or update results table with created_by tracking
                    # properties for results
                    results_params = {
                        "id_domain": id_domain,
                        "id_reasoning": id_reasoning,
                        "id_detection": id_detection,
                        "url": result.get('url', ''),
                        "keywords": keyword,
                        "reasoning_text": reasoning_text,
                        "image_final_path": image_base64 or image_path,
                        "label_final": label_final,
                        "final_confidence": final_confidence,
                        "created_by": username,
                        "modified_by": username
                    }
                    
                    # Check if result for this domain already exists
                    existing_result = conn.execute(text("SELECT 1 FROM results WHERE id_domain = :id_domain"), {"id_domain": id_domain}).fetchone()
                    
                    try:
                        if existing_result:
                            # UPDATE
                            print(f"[DATABASE] Updating existing result for id_domain={id_domain}", flush=True)
                            conn.execute(text("""
                                UPDATE results SET
                                    id_reasoning = :id_reasoning,
                                    id_detection = :id_detection,
                                    url = :url,
                                    keywords = :keywords,
                                    reasoning_text = :reasoning_text,
                                    image_final_path = :image_final_path,
                                    label_final = :label_final,
                                    final_confidence = :final_confidence,
                                    modified_by = :modified_by,
                                    modified_at = now()
                                WHERE id_domain = :id_domain
                            """), results_params)
                            print(f"[DATABASE] Updated existing result for id_domain={id_domain}", flush=True)
                        else:
                            # INSERT
                            print(f"[DATABASE] Inserting new result for id_domain={id_domain}", flush=True)
                            print(f"[DATABASE] Params: label_final={results_params.get('label_final')}, confidence={results_params.get('final_confidence')}", flush=True)
                            conn.execute(text("""
                                INSERT INTO results (
                                    id_domain,
                                    id_reasoning,
                                    id_detection,
                                    url,
                                    keywords,
                                    reasoning_text,
                                    image_final_path,
                                    label_final,
                                    final_confidence,
                                    status,
                                    created_by,
                                    created_at,
                                    modified_by,
                                    modified_at
                                ) VALUES (
                                    :id_domain,
                                    :id_reasoning,
                                    :id_detection,
                                    :url,
                                    :keywords,
                                    :reasoning_text,
                                    :image_final_path,
                                    :label_final,
                                    :final_confidence,
                                    'unverified',
                                    :created_by,
                                    now(),
                                    :modified_by,
                                    now()
                                )
                            """), results_params)
                            print(f"[DATABASE] Inserted into results", flush=True)
                        
                        results_saved_count += 1
                    except Exception as e:
                        print(f"[ERROR] Failed to update/insert results table: {str(e)}", flush=True)
                        import traceback
                        print(f"[ERROR] Traceback: {traceback.format_exc()}", flush=True)
                        raise  # Re-raise to be caught by outer exception handler
                    
                    # Add audit log entry for domain creation (optional, don't fail if it errors)
                    try:
                        conn.execute(text("""
                            INSERT INTO audit_log (id_result, action, username, timestamp)
                            SELECT id_results, 'created', :username, now()
                            FROM results
                            WHERE id_domain = :id_domain
                            LIMIT 1
                        """), {
                            "username": username,
                            "id_domain": id_domain
                        })
                        print(f"[DATABASE] Audit log created for id_domain={id_domain}", flush=True)
                    except Exception as audit_error:
                        print(f"[WARN] Failed to create audit log (non-critical): {str(audit_error)[:100]}", flush=True)
                    
                    print(f"[DATABASE] Record {idx+1}/{len(all_results)} saved successfully", flush=True)
                    
                except Exception as record_error:
                    failed_count += 1
                    print(f"[DATABASE] ERROR saving record {idx+1}: {str(record_error)}", flush=True)
                    import traceback
                    print(f"[DATABASE] Record error traceback: {traceback.format_exc()}", flush=True)
                    # Continue with next record instead of failing completely
            
            print(f"[DATABASE] ===== SAVE SUMMARY =====", flush=True)
            print(f"[DATABASE] Successfully saved {saved_count} domains to generated_domains", flush=True)
            print(f"[DATABASE] Successfully saved {detection_saved_count} detection results to object_detection", flush=True)
            print(f"[DATABASE] Successfully saved {results_saved_count} results with created_by={username}", flush=True)
            print(f"[DATABASE] Failed records: {failed_count}", flush=True)
            print(f"[DATABASE] ===========================", flush=True)
            return saved_count > 0  # Return True if at least one record was saved
            
    except Exception as e:
        print(f"[DATABASE] CRITICAL ERROR: Failed to save to database - {str(e)}", flush=True)
        import traceback
        print(f"[DATABASE] Traceback: {traceback.format_exc()}", flush=True)
        return False





def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Domain Generator')
    parser.add_argument('-n', '--domain-count', type=int, default=10, help='Number of domains to generate')
    parser.add_argument('-k', '--keywords', type=str, help='Comma-separated list of keywords')
    parser.add_argument('-u', '--username', type=str, default='system', help='Username for created_by tracking')
    parser.add_argument('-d', '--domains', type=str, help='Comma-separated list of domains to process manually (skips search)')
    args = parser.parse_args()
    
    # Track start time
    start_time = time.time()
    
    # Load existing domains, blocked domains, and blocked keywords first
    print("[INIT] Loading existing domains, blocked domains, and blocked keywords...", flush=True)
    load_seen_domains()
    load_blocked_domains()
    blocked_keywords = load_blocked_keywords()
    print(f"[INIT] Loaded {len(SEEN_DOMAINS)} existing domains, {len(BLOCKED_DOMAINS)} blocked domains, {len(blocked_keywords)} blocked keywords", flush=True)
    
    # Get keywords - either from args, last keywords, or stdin
    # If manual domains are provided, we don't need keywords for search, but we need a value for the variable
    if args.domains:
        keywords = ["manual_entry"]
    elif args.keywords:
        keywords = [k.strip() for k in args.keywords.split(',') if k.strip()]
    else:
        # Try to load last keywords first
        last_keywords = load_last_keywords()
        if last_keywords:
            print(f"[INIT] Last used keywords: {', '.join(last_keywords)}", flush=True)
            try:
                # Use a timeout or non-blocking method if possible, or just default to input
                # In automated environment, this might block, so we should be careful.
                # If we are in a non-interactive shell (pipe), input() raises EOFError.
                if sys.stdin.isatty():
                    use_last = input("Use these keywords? (y/n): ").lower().strip()
                    if use_last == 'y':
                        keywords = last_keywords
                    else:
                        keyword_input = input("Masukkan keyword (pisahkan dengan koma): ")
                        keywords = [k.strip() for k in keyword_input.split(',') if k.strip()]
                else:
                    # Non-interactive, default to using last keywords or failing
                    print("[INFO] Non-interactive mode detected. Using last keywords.", flush=True)
                    keywords = last_keywords
            except EOFError:
                 keywords = last_keywords
        else:
            if sys.stdin.isatty():
                keyword_input = input("Masukkan keyword (pisahkan dengan koma): ")
                keywords = [k.strip() for k in keyword_input.split(',') if k.strip()]
            else:
                 print("[ERROR] No keywords provided and non-interactive mode", flush=True)
                 return

    if not keywords:
        print("[ERROR] No keywords provided", flush=True)
        return
    
    # Use domain count from args
    target_domains = args.domain_count
    global MAX_RESULT
    MAX_RESULT = target_domains
    
    # Get search results or use manual domains
    results = []
    
    if args.domains:
        print("[MODE] Manual domain entry mode", flush=True)
        # Process manual domains
        manual_domains = [d.strip() for d in args.domains.split(',') if d.strip()]
        for domain in manual_domains:
            # Basic cleanup - remove protocol if present to get clean domain, but keep full URL for fetching
            clean_domain = extract_domain(domain)
            if clean_domain == "unknown":
                # Maybe the user didn't put http/https, try to deduce
                clean_domain = domain
                url = f"https://{domain}"
            else:
                url = domain
                if not url.startswith('http'):
                    url = f"https://{url}"
            
            results.append({
                "title": f"Manual Entry: {clean_domain}",
                "href": url,
                "body": "Manual entry"
            })
            
        print(f"[MANUAL] Loaded {len(results)} domains for processing", flush=True)
        # Override target domains to match input length if in manual mode
        target_domains = len(results)
        MAX_RESULT = target_domains
        
    else:
        # SEARCH MODE
        print(f"[CONFIG] Keywords: {', '.join(keywords)}", flush=True)
        print(f"[CONFIG] Target domains: {target_domains}", flush=True)
        
        # Combine all keywords for search and add blocked keywords with minus operator
        query = ' OR '.join(keywords)
        if blocked_keywords:
            query += ' ' + ' '.join(f'-{kw}' for kw in blocked_keywords)
        print(f"[SEARCH] Starting search with query: {keywords} + blocked domains", flush=True)
        
        # Get search results
        print("[SEARCH] Fetching search results from DuckDuckGo...", flush=True)
        results = DDGS().text(query, max_results=target_domains * 5)  # Get more results to handle filtering
        
        if not results:
            print("[ERROR] No search results found", flush=True)
            return
        
        print(f"[SEARCH] Found {len(results)} search results", flush=True)
    
    # Get last ID and start from next
    last_id = get_last_id()
    current_id = last_id + 1
    
    print(f"[INIT] Starting ID: {current_id:08d}", flush=True)
    print(f"[FILTER] Filtering domains (target: {target_domains})...", flush=True)
    
    # Process results until we have target_domains valid domains
    new_domains_list = []
    filtered_no_duplicates = []
    
    for r in results:
        if len(filtered_no_duplicates) >= target_domains:
            break
        
        domain = extract_domain(r.get("href", "-"))
        
        # Check various conditions to skip URL
        if domain == "unknown":
            print(f"[FILTER] Skipped invalid domain from URL: {r.get('href', '-')[:50]}...", flush=True)
            continue
        
        if is_domain_blocked(domain):
            print(f"[FILTER] Skipped blocked domain: {domain}", flush=True)
            continue
        
        if is_domain_duplicate(domain):
            if args.domains:
                print(f"[FILTER] Domain {domain} is duplicate but allowing in MANUAL mode", flush=True)
            else:
                print(f"[FILTER] Skipped duplicate domain: {domain}", flush=True)
                continue
        
        # All checks passed - this is a valid domain
        filtered_no_duplicates.append(r)
        new_domains_list.append(domain)
        add_domain_to_set(domain)
        print(f"[FILTER] Added domain ({len(filtered_no_duplicates)}/{target_domains}): {domain}", flush=True)
    
    if not filtered_no_duplicates:
        print("[ERROR] No valid domains found after filtering", flush=True)
        return
    
    print(f"[FILTER] Filtering complete. Total valid domains: {len(filtered_no_duplicates)}", flush=True)
    
    # Process URLs with multithreading for fetching
    print(f"[FETCH] Starting to fetch {len(filtered_no_duplicates)} URLs...", flush=True)
    all_results = []
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS_FETCH) as executor:
        futures = {
            executor.submit(fetch_url_data, url_item, idx + 1, current_id + idx): idx
            for idx, url_item in enumerate(filtered_no_duplicates)
        }
        
        for future in as_completed(futures):
            result = future.result()
            all_results.append(result)
            print(f"[FETCH] Fetched {len(all_results)}/{len(filtered_no_duplicates)}: {result.get('domain', 'unknown')}", flush=True)
    
    # Sort by ID to maintain order
    all_results.sort(key=lambda x: int(x["id"]))
    print(f"[FETCH] Fetch complete. Total fetched: {len(all_results)}", flush=True)
    
    # Process screenshots in parallel (multiprocessing)
    print(f"[SCREENSHOT] Starting screenshot capture for {len(all_results)} URLs...", flush=True)
    process_screenshots_parallel(all_results)
    
    # Process both detection and reasoning API calls for successful screenshots
    print(f"[API] Starting parallel API calls (Detection + Reasoning) for successful screenshots...", flush=True)
    process_apis_parallel(all_results)
    
    # Generate timestamp
    now = datetime.utcnow()
    timestamp_iso = now.isoformat() + "Z"
    timestamp_filename = now.strftime("%d%m%y-%H%M")
    
    # Prepare metadata
    metadata = {
        "metadata": {
            "total_records": len(all_results),
            "generated_at": timestamp_iso,
            "version": VERSION,
            "keywords": keywords,
        },
        "data": all_results,
    }
    
    # Save to JSON
    json_filename = f"{timestamp_filename}.json"
    json_filepath = os.path.join(OUTPUT_DIR, json_filename)
    
    with open(json_filepath, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"[SAVE] JSON saved", flush=True)
    
    # Update last ID
    final_id = current_id + len(all_results) - 1
    save_last_id(final_id)
    print(f"[SAVE] Last ID updated: {final_id:08d}", flush=True)
    
    # Save new domains to file
    save_new_domains(new_domains_list)
    
    # Save keywords for next use
    save_last_keywords(keywords)
    
    # Save to database
    print(f"[DATABASE] Saving {len(all_results)} records to database...", flush=True)
    db_success = save_to_database(all_results, ', '.join(keywords), args.username)
    
    # === DEBUG: cek isi all_results sebelum summary ===
    print("[DEBUG] all_results length:", len(all_results), flush=True)
    for r in all_results:
        print(
            "[DEBUG] ID:", r.get("id"),
            "domain:", r.get("domain"),
            "screenshot_status:", r.get("screenshot_status"),
            flush=True
        )

    # Count screenshot results
    screenshot_success = sum(1 for r in all_results if r.get("screenshot_status") == "success")
    screenshot_failed = sum(1 for r in all_results if r.get("screenshot_status") == "failed")
    screenshot_skipped = sum(1 for r in all_results if r.get("screenshot_status") == "skipped")
    
    # Count detection API results
    detection_success = sum(1 for r in all_results if r.get("detection_status") == "success")
    detection_failed = sum(1 for r in all_results if r.get("detection_status") == "failed")
    
    # Count reasoning API results
    reasoning_success = sum(1 for r in all_results if r.get("reasoning_status") == "success")
    reasoning_failed = sum(1 for r in all_results if r.get("reasoning_status") == "failed")
    
    # Calculate elapsed time
    elapsed_time = int(time.time() - start_time)
    elapsed_minutes = elapsed_time // 60
    elapsed_seconds = elapsed_time % 60
    
    # Print summary as JSON for easy parsing
    summary = {
        "status": "success" if db_success else "partial_success",
        "timestamp": timestamp_iso,
        "time_elapsed": f"{elapsed_minutes:02d}:{elapsed_seconds:02d}",
        "time_elapsed_seconds": elapsed_time,
        "domains_generated": {
            "success": len(all_results),
            "total": target_domains
        },
        "screenshot": {
            "success": screenshot_success,
            "failed": screenshot_failed,
            "skipped": screenshot_skipped,
            "total": len(all_results)
        },
        "detection_api": {
            "success": detection_success,
            "failed": detection_failed,
            "total": screenshot_success
        },
        "reasoning_api": {
            "success": reasoning_success,
            "failed": reasoning_failed,
            "total": screenshot_success
        },
        "domains_inserted": len(all_results) if db_success else 0,
        "keywords": keywords
    }
    
    # ✅ TAMBAHIN INI
    summary_path = os.path.join(OUTPUT_DIR, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"[SAVE] Summary saved: {summary_path}", flush=True)

    # (Opsional tapi recommended) output JSON murni biar gampang diparse
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
