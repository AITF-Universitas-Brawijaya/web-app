from fastapi import APIRouter, HTTPException, Request
from backend.stores.overrides_store import apply_override
from backend.stores.history_store import add_history
import os, aiohttp, asyncio

router = APIRouter(prefix="/api/text-analyze", tags=["text-analyze"])

TEXT_MODEL_URL = os.getenv("TEXT_MODEL_URL", "")
IMAGE_ANALYZE_URL = os.getenv("IMAGE_ANALYZE_URL", "http://localhost:8000/api/image-analyze")
LAW_RAG_URL = os.getenv("LAW_RAG_URL", "http://localhost:8000/api/law-rag")

async def call_image_analyze(image_url: str):
    """Memanggil API Tim 5 untuk analisis gambar"""
    if not image_url:
        return {"message": "Tidak ada image_url dikirimkan."}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(IMAGE_ANALYZE_URL, json={"image_url": image_url}, timeout=8) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"message": f"API Tim 5 tidak merespons (status {resp.status})."}
    except Exception as e:
        return {"message": f"API Tim 5 belum aktif: {e}"}

async def call_law_rag(keywords:list[str], reasoning:str):
    """Memanggil API Tim 4 untuk konteks hukum"""
    if not keywords or not isinstance(keywords, list):
        return {"message": "Tidak ada daftar keywords valid untuk konteks hukum."}
    if not reasoning:
        return {"message": "Reasoning kosong, tidak dapat melakukan analisis hukum."}
    try:
        payload = {"keywords": keywords, "reasoning": reasoning}
        async with aiohttp.ClientSession() as session:
            async with session.post(LAW_RAG_URL, json=payload, timeout=8) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"message": f"API Tim 4 tidak merespons (status {resp.status})."}
    except Exception as e:
        return {"message": f"API Tim 4 belum aktif: {e}"}

async def simulate_text_classification(title, content, description, keywords:list[str]):
    """Simulasi klasifikasi teks (Tim 3) dummy"""
    await asyncio.sleep(0.5)
    return {
        "label": "judi online",
        "confidence": 0.91,
        "reasoning": (
            "Berdasarkan analisis konten, situs ini mengandung kata-kata seperti "
            "'slot', 'bonus', dan 'taruhan' yang umum digunakan pada platform perjudian online."
        ),
    }


@router.post("/")
async def analyze_text(request: Request):
    """
    Placeholder untuk API Tim 3 (Text Classification & Reasoning)
    """
    body = await request.json()

    url = body.get("url")
    title = body.get("title", "")
    description = body.get("description", "")
    content = body.get("content", "")
    keywords = body.get("keywords", [])
    image_url = body.get("image_url", "")

    if not url:
        raise HTTPException(status_code=400, detail="Parameter 'url' wajib diisi.")

    text_task = asyncio.create_task(simulate_text_classification(title, content, description, keywords))
    image_task = asyncio.create_task(call_image_analyze(image_url))
    text_result, image_result = await asyncio.gather(text_task, image_task)

    reasoning_text = text_result.get("reasoning", "")
    law_context = await call_law_rag(keywords, reasoning_text)

    label_text = text_result.get("label", "tidak diketahui")
    conf_text = text_result.get("confidence", 0.0)
    label_image = image_result.get("label", label_text)
    conf_image = image_result.get("confidence", 0.0)

    final_confidence = round((0.7 *conf_text + 0.3 *conf_image), 2)
    final_label = label_text if label_text == label_image else f"{label_text} (perlu verifikasi visual)"
    
    violated_laws = []
    if isinstance(law_context, dict) and "violated_laws" in law_context:
        violated_laws = [law["law"] for law in law_context["violated_laws"]]

    if violated_laws:
        law_text = f"yang secara hukum melanggar {', '.join(violated_laws)}."
    else:
        law_text = "namun belum ditemukan konteks hukum yang relevan."

    reasoning_final = (
        f"{reasoning_text} Berdasarkan analisis visual, model mendeteksi indikasi "
        f"'{label_image}' dengan tingkat keyakinan {conf_image}, {law_text}"
    )

    # Simpan hasil analisis ke database
    item_id = body.get("id")
    if item_id:
        patch = {
            "reasoning": reasoning_final,
            "kepercayaan": final_confidence,
            "jenis": final_label,
            "status": "unverified",
        }
        apply_override(int(item_id), patch)
        add_history(int(item_id), "AI analysis updated (text+image+law)")

    return {
        "url": url,
        "title": title,
        "description": description,
        "keywords": keywords,
        "text_label": label_text,
        "text_confidence": conf_text,
        "image_label": label_image,
        "image_confidence": conf_image,
        "final_label": final_label,
        "final_confidence": final_confidence,
        "reasoning": reasoning_final,
        "law_context": law_context,
        "message": "Semua komponen api dijalankan dengan sukses"
    }
