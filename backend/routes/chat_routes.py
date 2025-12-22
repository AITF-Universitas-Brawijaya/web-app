from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import requests
import os
from db import get_db

router = APIRouter(prefix="/api", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    item: dict
    username: str
    mode: str = "edukasi"  # "hukum" or "edukasi"


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
        - Reasoning: {req.item.get('reasoning')}
        - Status: {req.item.get('status')}

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

        # Tentukan endpoint berdasarkan mode
        target_url = "http://localhost:8002/v1/query/judol/edukasi"
        category = "edukasi"
        
        if req.mode == "hukum":
            target_url = "http://localhost:8002/v1/query/judol/hukum"
            category = "hukum/umum"
            
        print(f"Chat mode: {req.mode}, routing to: {target_url}", flush=True)

        try:
            # Construct payload for RAG service
            rag_payload = {
                "query": req.question,
                "k": 7,
                "category": category
            }
            
            # Kirim request ke RAG Service
            print(f"Sending request to RAG service: {rag_payload}", flush=True)
            response = requests.post(target_url, json=rag_payload, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                # Debug response structure
                print(f"RAG Response keys: {result.keys()}", flush=True)
                
                # Try to get response from various possible keys
                reply_text = result.get("response") or result.get("answer") or result.get("result")
                
                if not reply_text and "data" in result:
                     reply_text = result["data"].get("response")
                     
                if not reply_text:
                    reply_text = str(result) # Fallback to dumping the whole JSON
                else:
                    reply_text = str(reply_text).strip()
            else:
                reply_text = f"⚠️ RAG Service error (HTTP {response.status_code})."
                print(f"RAG Error: {response.text}", flush=True)
                
        except requests.exceptions.ConnectionError:
            print("RAG Connection Error: Service not running on port 8002", flush=True)
            reply_text = "⚠️ Layanan AI (RAG Service) tidak tersedia di port 8002. Pastikan service berjalan."
        except requests.exceptions.Timeout:
            reply_text = "⚠️ Layanan AI timeout (60s). Silakan coba lagi."
        except Exception as e:
            print(f"RAG Exception: {str(e)}", flush=True)
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
