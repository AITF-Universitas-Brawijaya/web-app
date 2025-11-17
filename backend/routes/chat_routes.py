from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os

router = APIRouter(prefix="/api", tags=["chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")

class ChatRequest(BaseModel):
    question: str
    item: dict


@router.post("/chat")
def chat(req: ChatRequest):
    """
    Endpoint untuk melakukan percakapan dengan model Mistral melalui Ollama.
    """
    try:
        # Bangun konteks dari data item
        context = f"""
        Berikut adalah informasi situs yang sedang dianalisis:
        - Link: {req.item.get('link')}
        - Jenis: {req.item.get('jenis')}
        - Reasoning: {req.item.get('reasoning')}
        - Status: {req.item.get('status')}
        - Tanggal: {req.item.get('tanggal')}

        Tugas kamu: bantu menjawab pertanyaan pengguna berdasarkan konteks di atas.
        Gunakan bahasa Indonesia yang baku dan profesional.
        """

        payload = {
            "model": MODEL_NAME,
            "prompt": f"{context}\n\nPertanyaan pengguna: {req.question}",
            "stream": False,
        }

        # Kirim ke Ollama (misalnya: localhost:11434/api/generate)
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")

        result = response.json()
        reply_text = result.get("response", "").strip()

        return {"reply": reply_text or "Model tidak memberikan respons."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
