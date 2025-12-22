import uvicorn
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import secrets
import requests  # Added for forwarding requests
import socket
import asyncio

# Konfigurasi
# Membuat API Key statis untuk kemudahan penggunaan, 
# di produksi sebaiknya gunakan env vars atau database.


app = FastAPI(title="Simple String API")


class StringInput(BaseModel):
    data: str
    num_domains: int = 5  # Number of domains to generate (default: 5)

class LinksInput(BaseModel):
    links: list[str]  # List of URLs to process directly

class ChatInput(BaseModel):
    query: str
    category: str  # 'hukum' or 'edukasi'
    k: int = 5
    max_new_tokens: int = 512
    temperature: float = 0.1

def is_port_open(host: str, port: int) -> bool:
    """Check if a port is open on the given host."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)  # Timeout 1 detik
    try:
        result = sock.connect_ex((host, port))
        return result == 0
    except Exception:
        return False
    finally:
        sock.close()

@app.get("/")
def read_root():
    return {"message": "API is running. Use POST /process, POST /process-links, POST /chat, or GET /health/services."}

@app.get("/health/services")
def check_services():
    """
    Cek status port layanan internal (8002 dan 9090).
    """
    ports_to_check = {
        "scrape_service": {
            "host": os.getenv("SCRAPE_SERVICE_HOST", "localhost"),
            "port": int(os.getenv("SCRAPE_SERVICE_PORT", "7000"))
        },
        "reasoning_service": {
            "host": os.getenv("REASONING_SERVICE_HOST", "localhost"),
            "port": int(os.getenv("REASONING_SERVICE_PORT", "8001"))
        },
        "chat_service": {
            "host": os.getenv("CHAT_SERVICE_HOST", "localhost"),
            "port": int(os.getenv("CHAT_SERVICE_PORT", "8002"))
        },
        "obj_detection_service": {
            "host": os.getenv("OBJ_DETECTION_SERVICE_HOST", "localhost"),
            "port": int(os.getenv("OBJ_DETECTION_SERVICE_PORT", "9090"))
        }
    }
    
    status = {}
    all_up = True
    
    for name, config in ports_to_check.items():
        is_open = is_port_open(config["host"], config["port"])
        status[name] = {
            "port": config["port"],
            "status": "up" if is_open else "down"
        }
        if not is_open:
            all_up = False
            
    return {
        "status": "healthy" if all_up else "degraded",
        "services": status
    }

import subprocess
import os

@app.post("/process")
async def process_string(input_data: StringInput):
    """
    Menerima sebuah string (keywords) dan menjalankan crawler.py dengan streaming logs.
    """
    
    async def crawler_log_generator():
        """Generator untuk streaming logs dari crawler subprocess"""
        # Path script crawler
        crawler_script = "/home/ubuntu/web-app/integrasi-service/domain-generator/crawler.py"
        working_dir = "/home/ubuntu/web-app/integrasi-service/domain-generator"
        
        # Command arguments
        python_executable = "/home/ubuntu/miniconda3/envs/prd6/bin/python"
        cmd = [
            python_executable,
            "-u",  # Unbuffered output for real-time streaming
            crawler_script,
            "-k", input_data.data,
            "-n", str(input_data.num_domains)
        ]
        
        try:
            # Yield info awal
            yield f"Starting crawler with keywords: '{input_data.data}'\n"
            yield f"Generating {input_data.num_domains} domains\n"
            
            # Jalankan subprocess dengan asyncio
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env={**os.environ, "PYTHONUNBUFFERED": "1"}
            )
            
            # Stream output line by line
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                yield line.decode('utf-8', errors='replace')
            
            # Tunggu proses selesai
            await process.wait()
            
            # Yield status akhir
            yield f"\n{'='*50}\n"
            if process.returncode == 0:
                yield f"✅ Crawler finished successfully!\n"
            else:
                yield f"❌ Crawler finished with error code: {process.returncode}\n"
                
        except Exception as e:
            yield f"\n❌ Error: {str(e)}\n"
    
    return StreamingResponse(
        crawler_log_generator(),
        media_type="text/plain",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.post("/process-links")
async def process_links(input_data: LinksInput):
    """
    Menerima kumpulan link dan menjalankan crawler.py langsung tanpa pencarian keyword.
    Link-link akan langsung diproses oleh crawler.
    """
    
    async def crawler_log_generator():
        """Generator untuk streaming logs dari crawler subprocess"""
        # Path script crawler
        crawler_script = "/home/ubuntu/web-app/integrasi-service/domain-generator/crawler.py"
        working_dir = "/home/ubuntu/web-app/integrasi-service/domain-generator"
        
        # Join links dengan koma untuk argumen -d
        domains_str = ','.join(input_data.links)
        
        # Command arguments
        cmd = [
            "/home/ubuntu/miniconda3/envs/prd6/bin/python",
            "-u",  # Unbuffered output untuk real-time streaming
            crawler_script,
            "-d", domains_str,  # Direct domains mode
        ]
        
        try:
            # Yield info awal
            yield f"Starting crawler with direct links (skipping search)\n"
            yield f"Processing {len(input_data.links)} URLs:\n"
            for i, link in enumerate(input_data.links, 1):
                yield f"  {i}. {link}\n"
            yield f"\n{'='*50}\n\n"
            
            # Jalankan subprocess dengan asyncio
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env={**os.environ, "PYTHONUNBUFFERED": "1"}
            )
            
            # Stream output line by line
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                yield line.decode('utf-8', errors='replace')
            
            # Tunggu proses selesai
            await process.wait()
            
            # Yield status akhir
            yield f"\n{'='*50}\n"
            if process.returncode == 0:
                yield f"✅ Crawler finished successfully!\n"
            else:
                yield f"❌ Crawler finished with error code: {process.returncode}\n"
                
        except Exception as e:
            yield f"\n❌ Error: {str(e)}\n"
    
    return StreamingResponse(
        crawler_log_generator(),
        media_type="text/plain",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.post("/chat")
def chat_proxy(input_data: ChatInput):
    """
    Menerima input chat dengan parameter konfigurasi, lalu meneruskan ke service internal.
    """
    if input_data.category not in ["hukum", "edukasi"]:
        raise HTTPException(status_code=400, detail="Category harus 'hukum' atau 'edukasi'")

    chat_service_url = os.getenv("CHAT_SERVICE_URL", "http://localhost:8002")
    target_url = f"{chat_service_url}/v1/query/judol/{input_data.category}"
    
    # Payload yang dikirim ke service downstream
    # Mengirim semua field yang diterima dari input
    payload = input_data.dict()

    try:
        # Timeout 5 menit (300 detik) karena model inference bisa lama
        response = requests.post(target_url, json=payload, timeout=300)
        
        # Kembalikan status code dan content dari service downstream apa adanya
        try:
            return response.json()
        except ValueError:
            return {
                "status": "forwarded",
                "upstream_status": response.status_code,
                "upstream_response": response.text
            }
            
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error connecting to downstream service: {str(e)}")

if __name__ == "__main__":
    print(f"Starting API server...")
    port = int(os.getenv("PORT", 5000))
    # Host 0.0.0.0 allows external access
    uvicorn.run(app, host="0.0.0.0", port=port)
