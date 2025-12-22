from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import requests
import os
from typing import Optional

router = APIRouter()

class RunPodChatRequest(BaseModel):
    query: str
    category: Optional[str] = "edukasi"
    k: Optional[int] = 5
    max_new_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.1

@router.post("/runpod-chat")
def runpod_chat_proxy(request: RunPodChatRequest):
    """
    Proxy endpoint for RunPod chat API to avoid CORS issues
    """
    try:
        runpod_base_url = os.getenv("SERVICE_API_URL", "http://localhost:5000")
        response = requests.post(
            f"{runpod_base_url}/chat",
            headers={
                "Content-Type": "application/json",
            },
            json={
                "query": request.query,
                "category": request.category,
                "k": request.k,
                "max_new_tokens": request.max_new_tokens,
                "temperature": request.temperature
            },
            timeout=60
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"RunPod API error: {response.text}"
            )
        
        return response.json()
        
    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Request timeout - API membutuhkan waktu terlalu lama untuk merespons"
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Tidak dapat terhubung ke API RunPod: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
