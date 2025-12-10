from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import requests
import os
from db import get_db

router = APIRouter(prefix="/api", tags=["chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")

class ChatRequest(BaseModel):
    question: str
    item: dict
    username: str


@router.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint untuk melakukan percakapan dengan model Mistral melalui Ollama.
    Menyimpan pesan user dan respons AI ke database.
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

        # Simpan pesan user ke database TERLEBIH DAHULU
        id_domain = req.item.get('id')
        if id_domain:
            insert_query = text("""
                INSERT INTO chat_history (username, id_domain, role, message)
                VALUES (:username, :id_domain, :role, :message)
            """)
            db.execute(insert_query, {
                "username": req.username,
                "id_domain": id_domain,
                "role": "user",
                "message": req.question
            })
            db.commit()

        # Coba kirim ke Ollama
        reply_text = None
        try:
            payload = {
                "model": MODEL_NAME,
                "prompt": f"{context}\n\nPertanyaan pengguna: {req.question}",
                "stream": False,
            }

            # Kirim ke Ollama dengan timeout yang lebih pendek
            response = requests.post(OLLAMA_URL, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                reply_text = result.get("response", "").strip()
            else:
                reply_text = f"⚠️ Ollama error (HTTP {response.status_code}). Silakan hubungi administrator untuk mengaktifkan layanan AI."
                
        except requests.exceptions.ConnectionError:
            reply_text = "⚠️ Layanan AI (Ollama) tidak tersedia. Silakan hubungi administrator untuk mengaktifkan layanan."
        except requests.exceptions.Timeout:
            reply_text = "⚠️ Layanan AI timeout. Silakan coba lagi atau hubungi administrator."
        except Exception as e:
            reply_text = f"⚠️ Error saat menghubungi AI: {str(e)}"
        
        if not reply_text:
            reply_text = "Model tidak memberikan respons."

        # Simpan respons AI ke database
        if id_domain:
            insert_query = text("""
                INSERT INTO chat_history (username, id_domain, role, message)
                VALUES (:username, :id_domain, :role, :message)
            """)
            db.execute(insert_query, {
                "username": req.username,
                "id_domain": id_domain,
                "role": "assistant",
                "message": reply_text
            })
            db.commit()

        return {"reply": reply_text}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
