# vps2_inference.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from inference_service import inference_generator

app = FastAPI()

@app.post("/infer")
def infer():
    return StreamingResponse(
        inference_generator(),
        media_type="text/plain"
    )
