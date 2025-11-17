from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from backend import db
from backend.routes import data_routes
from backend.routes import chat_routes, history_routes, update_routes, text_analyze_routes, image_analyze_routes, law_rag_routes 


load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")

app = FastAPI(title="PRD Chatbot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URL,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_routes.router)
app.include_router(update_routes.router)
app.include_router(history_routes.router)
app.include_router(chat_routes.router)
app.include_router(text_analyze_routes.router)
app.include_router(image_analyze_routes.router)
app.include_router(law_rag_routes.router) 

@app.get("/")
def root():
    return {"message": "FastAPI backend running OK"}
