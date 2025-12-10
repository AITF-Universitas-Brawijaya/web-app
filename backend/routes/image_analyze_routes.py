from fastapi import APIRouter, HTTPException, Request
import asyncio

router = APIRouter(prefix="/api/image-analyze", tags=["image-analyze"])

@router.post("/")
async def analyze_image(request: Request):
    """
    Placeholder untuk API Tim 5 (Computer Vision)
    """
    body = await request.json()
    image_url = body.get("image_url")

    if not image_url:
        raise HTTPException(status_code=400, detail="Parameter 'image_url' wajib diisi.")

    # Simulasi proses analisis gambar
    await asyncio.sleep(0.5)

    # Placeholder hasil deteksi (dummy)
    return {
        "label": "judi online", 
        "confidence": 0.82,
        "processed_image": "https://example.com/processed/slot_machine_detected.jpg",
        "message": "Gambar berhasil dianalisis"
    }
