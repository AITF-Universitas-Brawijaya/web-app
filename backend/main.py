from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

import db
from routes import data_routes
from routes import chat_routes, chat_history_routes, history_routes, update_routes, text_analyze_routes, image_analyze_routes, law_rag_routes, crawler_routes
from routes import auth_routes, audit_routes, admin_routes, notes_routes, image_routes, manual_domain_routes, feedback_routes, keyword_routes


load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")

app = FastAPI(title="PRD Chatbot Backend")

# Allow all origins for RunPod proxy compatibility
# When behind Nginx, origin headers vary and strict CORS breaks the app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for RunPod proxy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes (no auth required)
app.include_router(auth_routes.router)

# Protected routes (authentication required)
app.include_router(data_routes.router)
app.include_router(update_routes.router)
app.include_router(audit_routes.router)
app.include_router(history_routes.router)
app.include_router(chat_routes.router)
app.include_router(chat_history_routes.router)
app.include_router(text_analyze_routes.router)
app.include_router(image_analyze_routes.router)
app.include_router(law_rag_routes.router)
app.include_router(crawler_routes.router, prefix="/api/crawler", tags=["crawler"])
app.include_router(admin_routes.router)
app.include_router(notes_routes.router)
app.include_router(image_routes.router)
app.include_router(manual_domain_routes.router)
app.include_router(feedback_routes.router)
app.include_router(keyword_routes.router)

@app.get("/")
def root():
    return {"message": "FastAPI backend running OK"}
