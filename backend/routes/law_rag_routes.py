from fastapi import APIRouter, HTTPException, Request
import asyncio

router = APIRouter(prefix="/api/law-rag", tags=["law-rag"])

@router.post("/")
async def analyze_law_context(request: Request):
    body = await request.json()
    keywords = body.get("keywords", [])
    reasoning = body.get("reasoning", "")

    if not keywords or not isinstance(keywords, list):
        raise HTTPException(status_code=400, detail="Parameter 'keywords' wajib berupa list dan tidak boleh kosong.")
    if not reasoning:
        raise HTTPException(status_code=400, detail="Parameter 'reasoning' wajib diisi.")

    await asyncio.sleep(0.5)

    reasoning_lower = reasoning.lower()
    if any(term in reasoning_lower for term in ["judi", "taruhan", "slot", "kasino"]):
        violated_laws = [
            {"law": "UU ITE Pasal 27 Ayat (2)"},
            {"law": "PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik"},
        ]
        summary = (
            "Berdasarkan reasoning dan konteks yang diberikan, aktivitas situs termasuk "
            "dalam kategori perjudian online yang dilarang."
        )
    else:
        violated_laws = []
        summary = "Tidak ditemukan pelanggaran hukum yang relevan berdasarkan reasoning yang diberikan."

    return {"violated_laws": violated_laws, "summary": summary, "message": "Analisis hukum berhasil dijalankan (dummy mode)."}
