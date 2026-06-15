from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API
app.include_router(knowledges_router, prefix="/api/knowledges", tags=["Knowledges"])
app.include_router(protections_router, prefix="/api/protections", tags=["Protections"])

# Servir le frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")

@app.get("/")
def root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/health")
def health():
    return {"status": "ok"}
