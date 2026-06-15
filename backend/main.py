from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes.knowledges import router as knowledges_router
from routes.protections import router as protections_router

load_dotenv()

app = FastAPI(
    title="KnowledgeVal API",
    description="API de valorisation des connaissances",
    version="1.0.0"
)

# CORS — autoriser le frontend à appeler le backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://127.0.0.1:5500"),
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(knowledges_router, prefix="/api/knowledges", tags=["Knowledges"])
app.include_router(protections_router, prefix="/api/protections", tags=["Protections"])


@app.get("/")
def root():
    return {"message": "KnowledgeVal API opérationnelle", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
