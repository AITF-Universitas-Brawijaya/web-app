#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Force unbuffered output for real-time streaming
import sys
import os

# Reconfigure stdout and stderr to be unbuffered
if sys.stdout is not None:
    sys.stdout.reconfigure(line_buffering=False, write_through=True)
if sys.stderr is not None:
    sys.stderr.reconfigure(line_buffering=False, write_through=True)

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
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from multiprocessing import Pool, cpu_count
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import requests


# Load environment variables
load_dotenv()

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
OUTPUT_IMG_DIR = os.path.join(OUTPUT_DIR, "img")
LAST_ID_FILE = os.path.join(OUTPUT_DIR, "last_id.txt")
ALL_DOMAINS_FILE = os.path.join(OUTPUT_DIR, "all_domains.txt")
LAST_KEYWORDS_FILE = os.path.join(OUTPUT_DIR, "last_keywords.txt")
BLOCKED_KEYWORDS_FILE = os.path.join(os.path.dirname(__file__), "blocked_keywords.txt")
BLOCKED_DOMAINS_FILE = os.path.join(OUTPUT_DIR, "..", "blocked_domains.txt")  # Relative to crawler root

# Database configuration
DATABASE_URL = os.getenv("DB_URL", "postgresql://postgres:root@localhost:5432/prd")
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
DETECTION_API_URL = "http://localhost:9090/predict"
MAX_RESULT = 10  # Maximum number of valid domains to process per run
VERSION = "1.4"

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
        options = Options()
        # Path configuration
        project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        default_chrome = os.path.join(project_dir, "bin", "chrome-linux64", "chrome")
        default_driver = os.path.join(project_dir, "bin", "chromedriver-linux64", "chromedriver")
        
        chrome_bin = os.getenv("CHROME_PATH", default_chrome)
        driver_bin = os.getenv("CHROMEDRIVER_PATH", default_driver)
        
        # Fallback to system if portable not found
        if not os.path.exists(chrome_bin):
            chrome_bin = "/usr/bin/google-chrome" # System fallback
            
        options.binary_location = chrome_bin
        
        # Essential headless arguments
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        # Additional stability arguments
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--disable-web-security")
        options.add_argument("--disable-features=VizDisplayCompositor")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--start-maximized")
        options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        
        # Disable logging
        options.add_argument("--log-level=3")
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        if os.path.exists(driver_bin):
             service = Service(driver_bin)
        else:
             service = Service("/usr/bin/chromedriver") # System fallback
        driver = webdriver.Chrome(service=service, options=options)
        
        # Increased timeout
        driver.set_page_load_timeout(30)
        driver.set_script_timeout(30)
        
        driver.get(url)
        time.sleep(3)  # Wait for page to fully load
        driver.save_screenshot(output_path)
        driver.quit()
        
        return True
        
    except Exception as e:
        print(f"[SCREENSHOT ERROR] {item_id}: {str(e)[:100]}")
        return False


def take_screenshot(url, output_path, retries=2):
    """Take screenshot of the URL (no retries on timeout)."""
    try:
        options = Options()
        # Path configuration
        project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        default_chrome = os.path.join(project_dir, "bin", "chrome-linux64", "chrome")
        default_driver = os.path.join(project_dir, "bin", "chromedriver-linux64", "chromedriver")
        
        chrome_bin = os.getenv("CHROME_PATH", default_chrome)
        driver_bin = os.getenv("CHROMEDRIVER_PATH", default_driver)
        
        # Fallback to system if portable not found
        if not os.path.exists(chrome_bin):
            chrome_bin = "/usr/bin/google-chrome" # System fallback

        options.binary_location = chrome_bin
        
        # Essential headless arguments
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        # Additional stability arguments
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--disable-web-security")
        options.add_argument("--disable-features=VizDisplayCompositor")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--start-maximized")
        options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        
        # Disable logging
        options.add_argument("--log-level=3")
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        if os.path.exists(driver_bin):
             service = Service(driver_bin)
        else:
             service = Service("/usr/bin/chromedriver") # System fallback
        driver = webdriver.Chrome(service=service, options=options)
        
        # Increased timeout
        driver.set_page_load_timeout(30)
        driver.set_script_timeout(30)
        
        driver.get(url)
        time.sleep(3)  # Wait for page to fully load
        driver.save_screenshot(output_path)
        driver.quit()
        
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
                success = future.result()
                results_status[item_id] = "success" if success else "failed"
                completed += 1
                status_symbol = "✓" if success else "✗"
                print(f"[{completed}/{len(screenshot_tasks)}] {item_id} {status_symbol}")
            except Exception as e:
                results_status[item_id] = "failed"
                completed += 1
                print(f"[{completed}/{len(screenshot_tasks)}] {item_id} ✗ (Exception: {str(e)[:50]})")
    
    # Update screenshot status in results
    for result in all_results:
        item_id = result.get("id", "unknown")
        if item_id in results_status:
            result["screenshot_status"] = results_status[item_id]
        else:
            result["screenshot_status"] = "skipped"


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


def process_detection_api_parallel(all_results):
    """Process detection API calls in parallel for successful screenshots."""
    # Filter only successful screenshots
    detection_tasks = []
    for result in all_results:
        if result.get('screenshot_status') == 'success':
            item_id = result.get('id', 'unknown')
            screenshot_path = os.path.join(OUTPUT_IMG_DIR, f"{item_id}.png")
            detection_tasks.append((screenshot_path, item_id, result))
    
    if not detection_tasks:
        print("[DETECTION API] No successful screenshots to process")
        return
    
    print(f"\n[DETECTION API] Sending {len(detection_tasks)} screenshots to API with {MAX_WORKERS_DETECTION} workers")
    
    # Use ThreadPoolExecutor for API calls
    with ThreadPoolExecutor(max_workers=MAX_WORKERS_DETECTION) as executor:
        futures = {
            executor.submit(send_to_detection_api, path, item_id): (item_id, result)
            for path, item_id, result in detection_tasks
        }
        
        completed = 0
        for future in as_completed(futures):
            item_id, result = futures[future]
            try:
                api_response = future.result()
                if api_response:
                    result['detection_api_response'] = api_response
                    result['detection_status'] = 'success'
                else:
                    result['detection_status'] = 'failed'
                completed += 1
                status_symbol = "✓" if api_response else "✗"
                print(f"[{completed}/{len(detection_tasks)}] {item_id} {status_symbol}")
            except Exception as e:
                result['detection_status'] = 'failed'
                completed += 1
                print(f"[{completed}/{len(detection_tasks)}] {item_id} ✗ (Exception: {str(e)[:50]})")
    
    # Print summary
    success_count = sum(1 for r in all_results if r.get('detection_status') == 'success')
    failed_count = sum(1 for r in all_results if r.get('detection_status') == 'failed')
    print(f"[DETECTION API] Complete: {success_count} success, {failed_count} failed")


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
                        # Optionally update the image_path if it's new
                        if image_path:
                            conn.execute(text("UPDATE generated_domains SET image_path = :image_path WHERE id_domain = :id_domain"), 
                                        {"image_path": image_path, "id_domain": id_domain})
                    else:
                        # Insert into generated_domains and let database auto-increment id_domain
                        insert_result = conn.execute(text("""
                            INSERT INTO generated_domains (url, title, domain, image_path)
                            VALUES (:url, :title, :domain, :image_path)
                            RETURNING id_domain
                        """), {
                            "url": result.get('url', ''),
                            "title": result.get('title', '')[:255],  # Limit to 255 chars
                            "domain": result.get('domain', ''),
                            "image_path": image_path
                        })
                        id_domain = insert_result.fetchone()[0]
                        print(f"[DATABASE] Inserted into generated_domains with id_domain={id_domain}", flush=True)
                    
                    saved_count += 1
                    
                    # Prepare detection data if available
                    id_detection = None
                    label_final = None
                    final_confidence = None
                    image_detected_path = None
                    
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
                        final_confidence = confidence_score
                        
                        visualization_path = api_result.get('visualization_path', '')
                        if visualization_path:
                            visualization_path = visualization_path.lstrip('/')
                            image_detected_path = f"~/tim5_prd_workdir/Gambling-Pipeline/{visualization_path}"
                        
                        id_detection = api_result.get('id')
                        
                        # Insert into object_detection table
                        conn.execute(text("""
                            INSERT INTO object_detection (
                                id_detection,
                                id_domain,
                                label,
                                confidence_score,
                                image_detected_path,
                                bounding_box,
                                ocr,
                                model_version
                            ) VALUES (
                                :id_detection,
                                :id_domain,
                                :label,
                                :confidence_score,
                                :image_detected_path,
                                :bounding_box,
                                :ocr,
                                :model_version
                            )
                            ON CONFLICT (id_domain) DO UPDATE SET
                                id_detection = EXCLUDED.id_detection,
                                label = EXCLUDED.label,
                                confidence_score = EXCLUDED.confidence_score,
                                image_detected_path = EXCLUDED.image_detected_path,
                                bounding_box = EXCLUDED.bounding_box,
                                ocr = EXCLUDED.ocr,
                                model_version = EXCLUDED.model_version,
                                processed_at = now()
                        """), {
                            "id_detection": id_detection,
                            "id_domain": id_domain,
                            "label": label,
                            "confidence_score": confidence_score,
                            "image_detected_path": image_detected_path,
                            "bounding_box": json.dumps(api_result.get('detections', [])),
                            "ocr": json.dumps(api_result.get('ocr', [])),
                            "model_version": None
                        })
                        detection_saved_count += 1
                        print(f"[DATABASE] Inserted into object_detection", flush=True)
                    
                    # Insert or update results table with created_by tracking
                    # properties for results
                    results_params = {
                        "id_domain": id_domain,
                        "id_detection": id_detection,
                        "url": result.get('url', ''),
                        "keywords": keyword,
                        "image_final_path": image_detected_path or image_path,
                        "label_final": label,
                        "final_confidence": final_confidence,
                        "created_by": username,
                        "modified_by": username
                    }
                    
                    # Check if result for this domain already exists
                    existing_result = conn.execute(text("SELECT 1 FROM results WHERE id_domain = :id_domain"), {"id_domain": id_domain}).fetchone()
                    
                    try:
                        with conn.begin_nested():
                            if existing_result:
                                # UPDATE
                                conn.execute(text("""
                                    UPDATE results SET
                                        id_detection = :id_detection,
                                        url = :url,
                                        keywords = :keywords,
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
                                conn.execute(text("""
                                    INSERT INTO results (
                                        id_domain,
                                        id_detection,
                                        url,
                                        keywords,
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
                                        :id_detection,
                                        :url,
                                        :keywords,
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
                         print(f"[WARN] Failed to update/insert results table: {e}", flush=True)
                    
                    # Add audit log entry for domain creation
                    conn.execute(text("""
                        INSERT INTO audit_log (id_result, action, username, timestamp)
                        SELECT id_results, 'created', :username, now()
                        FROM results
                        WHERE id_domain = :id_domain
                    """), {
                        "username": username,
                        "id_domain": id_domain
                    })
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
    
    # Process detection API calls for successful screenshots
    print(f"[DETECTION API] Starting object detection for successful screenshots...", flush=True)
    process_detection_api_parallel(all_results)
    
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
    
    # Count screenshot results
    screenshot_success = sum(1 for r in all_results if r.get("screenshot_status") == "success")
    screenshot_failed = sum(1 for r in all_results if r.get("screenshot_status") == "failed")
    screenshot_skipped = sum(1 for r in all_results if r.get("screenshot_status") == "skipped")
    
    # Count detection API results
    detection_success = sum(1 for r in all_results if r.get("detection_status") == "success")
    detection_failed = sum(1 for r in all_results if r.get("detection_status") == "failed")
    
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
        "domains_inserted": len(all_results) if db_success else 0,
        "keywords": keywords
    }
    
    print("[SUMMARY] " + json.dumps(summary), flush=True)
    print("[DONE]", flush=True)


if __name__ == "__main__":
    main()
