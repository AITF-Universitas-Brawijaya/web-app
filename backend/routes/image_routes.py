from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from pathlib import Path

router = APIRouter(prefix="/api/images", tags=["Images"])

@router.get("/detection/{filename}")
async def get_detection_image(filename: str):
    """
    Serve object detection images from the Gambling-Pipeline results directory.
    """
    try:
        # Base path for detection images
        base_path = Path.home() / "tim5_prd_workdir" / "Gambling-Pipeline" / "results" / "inference"
        
        # Construct full path
        file_path = base_path / filename
        
        # Security check: ensure the file is within the allowed directory
        file_path = file_path.resolve()
        base_path = base_path.resolve()
        
        if not str(file_path).startswith(str(base_path)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Image not found: {filename}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Not a file")
        
        # Determine media type based on extension
        ext = file_path.suffix.lower()
        media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=3600"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")


@router.get("/screenshot/{filename}")
async def get_screenshot_image(filename: str):
    """
    Serve screenshot images from the domain-generator output directory.
    """
    try:
        # Base path for screenshot images
        base_path = Path.home() / "tim6_prd_workdir" / "backend" / "domain-generator" / "output" / "img"
        
        # Construct full path
        file_path = base_path / filename
        
        # Security check: ensure the file is within the allowed directory
        file_path = file_path.resolve()
        base_path = base_path.resolve()
        
        if not str(file_path).startswith(str(base_path)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Image not found: {filename}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Not a file")
        
        return FileResponse(
            path=str(file_path),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")

