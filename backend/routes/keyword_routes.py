"""
Keyword Generation Routes
Handles keyword generation using SerpAPI
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from db import get_db
from utils.auth_middleware import get_current_user, require_role
from utils.serpapi_service import get_serpapi_key, get_serpapi_quota, generate_keywords

router = APIRouter(prefix="/api/keywords", tags=["Keywords"])


# ============================================================
# Pydantic Models
# ============================================================

class KeywordGenerateRequest(BaseModel):
    keyword: str


class KeywordGenerateResponse(BaseModel):
    keywords: List[str]


class QuotaResponse(BaseModel):
    used: int
    limit: int
    remaining: int


# ============================================================
# Keyword Generation Endpoints
# ============================================================

@router.post("/generate", response_model=KeywordGenerateResponse)
async def generate_keywords_endpoint(
    request: KeywordGenerateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate trending keywords from a base keyword using SerpAPI.
    Requires authentication.
    """
    try:
        # Get SerpAPI key from database
        api_key = get_serpapi_key(db)
        
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="SerpAPI key not configured. Please contact administrator."
            )
        
        # Generate keywords
        keywords = generate_keywords(request.keyword, api_key)
        
        return {"keywords": keywords}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate keywords: {str(e)}"
        )


@router.get("/quota", response_model=QuotaResponse)
async def get_quota_endpoint(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Get SerpAPI quota information.
    Only accessible by administrators.
    """
    try:
        # Get SerpAPI key from database
        api_key = get_serpapi_key(db)
        
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="SerpAPI key not configured"
            )
        
        # Get quota information
        quota = get_serpapi_quota(api_key)
        
        return quota
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch quota: {str(e)}"
        )
