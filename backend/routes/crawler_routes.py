from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import uuid
import asyncio
from typing import Dict, Optional
import signal
from utils.auth_middleware import get_current_user

router = APIRouter()

# Store active crawler processes (async)
active_processes: Dict[str, asyncio.subprocess.Process] = {}

class CrawlerRequest(BaseModel):
    domain_count: int
    keywords: list[str]

class ManualCrawlerRequest(BaseModel):
    domains: list[str]

class CrawlerStatus(BaseModel):
    job_id: str
    status: str
    summary: Optional[dict] = None

@router.post("/start")
async def start_crawler(request: CrawlerRequest, current_user: dict = Depends(get_current_user)):
    """
    Start the crawler with the given parameters.
    Requires authentication - created_by will be set to current user.
    """
    try:
        if request.domain_count <= 0:
            raise HTTPException(status_code=400, detail="Domain count must be positive")
        
        if not request.keywords or len(request.keywords) == 0:
            raise HTTPException(status_code=400, detail="Keywords cannot be empty")
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Path to crawler script
        crawler_path = os.path.join(os.path.dirname(__file__), "..", "domain-generator", "crawler.py")
        
        # Prepare command - use bash to activate conda environment
        keywords_str = ','.join(request.keywords)
        username = current_user.get("username", "unknown")
        
        # Use bash wrapper to activate conda environment before running crawler
        cmd = (
            f"source /home/ubuntu/miniconda3/etc/profile.d/conda.sh && "
            f"conda activate prd6 && "
            f"cd {os.path.dirname(crawler_path)} && "
            f"python3 -u crawler.py -n {request.domain_count} -k '{keywords_str}' -u '{username}'"
        )
        
        # Start crawler process asynchronously with bash and unbuffered output
        process = await asyncio.create_subprocess_exec(
            "/bin/bash",
            "-c",
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )
        
        # Store process
        active_processes[job_id] = process
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": f"Crawler started with {request.domain_count} domains and {len(request.keywords)} keywords"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start crawler: {str(e)}")

@router.post("/manual")
async def start_manual_crawler(request: ManualCrawlerRequest, current_user: dict = Depends(get_current_user)):
    """
    Start the crawler with a manual list of domains.
    Requires authentication.
    """
    try:
        if not request.domains or len(request.domains) == 0:
            raise HTTPException(status_code=400, detail="Domains list cannot be empty")
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Path to crawler script
        crawler_path = os.path.join(os.path.dirname(__file__), "..", "domain-generator", "crawler.py")
        
        # Prepare domains string (comma separate)
        domains_str = ','.join(request.domains)
        username = current_user.get("username", "unknown")
        
        # Use bash wrapper to activate conda environment before running crawler
        # Pass domains via -d argument
        cmd = (
            f"source /home/ubuntu/miniconda3/etc/profile.d/conda.sh && "
            f"conda activate prd6 && "
            f"cd {os.path.dirname(crawler_path)} && "
            f"python3 -u crawler.py -d '{domains_str}' -u '{username}'"
        )
        
        # Start crawler process asynchronously
        process = await asyncio.create_subprocess_exec(
            "/bin/bash",
            "-c",
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )
        
        # Store process
        active_processes[job_id] = process
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": f"Manual crawler started with {len(request.domains)} domains"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start manual crawler: {str(e)}")

@router.get("/logs/{job_id}")
async def stream_logs(job_id: str):
    """
    Stream real-time logs from crawler process using Server-Sent Events.
    """
    if job_id not in active_processes:
        raise HTTPException(status_code=404, detail="Job not found")
    
    process = active_processes[job_id]
    
    async def event_generator():
        try:
            # Send initial keepalive
            yield f": keepalive\n\n"
            
            # Stream stdout line by line using async readline
            while True:
                # Use asyncio.wait_for to add timeout and prevent hanging
                try:
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=0.1)
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent connection timeout
                    yield f": keepalive\n\n"
                    
                    # Check if process has finished
                    if process.returncode is not None:
                        break
                    continue
                
                if not line:
                    # EOF reached
                    break
                
                # Decode and send line as SSE event immediately
                decoded_line = line.decode('utf-8').strip()
                if decoded_line:
                    # Yield immediately - don't batch
                    yield f"data: {decoded_line}\n\n"
            
            # Wait for process to complete
            await process.wait()
            
            # Send completion event
            yield f"data: [DONE]\n\n"
            
            # Clean up
            if job_id in active_processes:
                del active_processes[job_id]
                
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
            if job_id in active_processes:
                del active_processes[job_id]
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.post("/cancel/{job_id}")
async def cancel_crawler(job_id: str):
    """
    Cancel a running crawler process.
    """
    if job_id not in active_processes:
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:
        process = active_processes[job_id]
        
        # Try graceful termination first
        process.terminate()
        
        # Wait up to 5 seconds for graceful shutdown
        try:
            await asyncio.wait_for(process.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            # Force kill if still running
            process.kill()
            await process.wait()
        
        # Clean up
        del active_processes[job_id]
        
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Crawler process terminated"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel crawler: {str(e)}")

@router.get("/status/{job_id}")
async def get_crawler_status(job_id: str):
    """
    Get the status of a crawler job.
    """
    if job_id not in active_processes:
        return {
            "job_id": job_id,
            "status": "completed_or_not_found",
            "message": "Job not found in active processes"
        }
    
    process = active_processes[job_id]
    
    # Check if process is still running
    if process.returncode is None:
        return {
            "job_id": job_id,
            "status": "running",
            "message": "Crawler is currently running"
        }
    else:
        # Process completed
        del active_processes[job_id]
        return {
            "job_id": job_id,
            "status": "completed",
            "message": "Crawler process completed",
            "exit_code": process.returncode
        }
