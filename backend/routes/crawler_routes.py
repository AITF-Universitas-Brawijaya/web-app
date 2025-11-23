from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import subprocess
import os
import uuid
import asyncio
from typing import Dict, Optional
import signal

router = APIRouter()

# Store active crawler processes
active_processes: Dict[str, subprocess.Popen] = {}

class CrawlerRequest(BaseModel):
    domain_count: int
    keywords: list[str]

class CrawlerStatus(BaseModel):
    job_id: str
    status: str
    summary: Optional[dict] = None

@router.post("/start")
async def start_crawler(request: CrawlerRequest):
    """
    Start the crawler with the given parameters.
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
        
        # Prepare command
        keywords_str = ','.join(request.keywords)
        cmd = [
            "python3",
            crawler_path,
            "-n", str(request.domain_count),
            "-k", keywords_str
        ]
        
        # Start crawler process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Line buffered
            cwd=os.path.dirname(crawler_path)
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
            # Stream stdout line by line
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                
                # Send line as SSE event
                yield f"data: {line.strip()}\n\n"
                await asyncio.sleep(0)  # Allow other tasks to run
            
            # Wait for process to complete
            process.wait()
            
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
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            # Force kill if still running
            process.kill()
            process.wait()
        
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
    if process.poll() is None:
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
