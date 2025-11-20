from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Import routes
from routes import chat_routes, data_routes, history_routes, links_routes, update_routes
from routes import text_analyze_routes, image_analyze_routes, law_rag_routes

# Load file .env
load_dotenv()

# Ambil variabel
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")

# App Initialize
app = FastAPI(title="PRD Chatbot Backend")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URL,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(data_routes.router)
app.include_router(update_routes.router)
app.include_router(history_routes.router)
app.include_router(links_routes.router)
app.include_router(chat_routes.router)
app.include_router(text_analyze_routes.router)
app.include_router(image_analyze_routes.router)
app.include_router(law_rag_routes.router)  

@app.get("/")
def root():
    return {
        "message": "FastAPI backend is running",
        "frontend_allowed": FRONTEND_URL,
        "ollama_url": OLLAMA_URL,
        "model": MODEL_NAME
    }
