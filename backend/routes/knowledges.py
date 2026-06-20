from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from db import supabase, PDF_BUCKET
from services.claude import analyser_document

router = APIRouter()


class ScoresDetail(BaseModel):
    c1: int
    c2: int
    c3: int
    c4: int
    c5: int
    c6: int


class KnowledgeCreate(BaseModel):
    titre: str
    description: str
    type: str
    domaine: str
    score: int
    scores_detail: ScoresDetail
    decision: str
    rev_est: str = "—"
    cost_est: str = "—"
    delai: str = "—"
    statut_jur: str = "Non protégée"
    maturite: str = "Idée"
    fichier_url: Optional[str] = None   # ← nouveau


def calculer_meta(score: int) -> dict:
    if score > 20:
        return {
            "decision": "Protéger & commercialiser",
            "rev_est": f"{score * 400} €",
            "cost_est": f"{score * 150} €",
            "delai": f"{round((30 - score) / 3)} mois",
            "statut_jur": "En analyse",
            "maturite": "Prototype",
        }
    elif score > 10:
        return {
            "decision": "Analyse complémentaire",
            "rev_est": f"{score * 200} €",
            "cost_est": f"{score * 80} €",
            "delai": "—",
            "statut_jur": "Non protégée",
            "maturite": "Idée",
        }
    else:
        return {
            "decision": "Conservation interne",
            "rev_est": "—",
            "cost_est": "—",
            "delai": "—",
            "statut_jur": "Non protégée",
            "maturite": "Idée",
        }


@router.post("/extract-document")
async def extract_document(file: UploadFile = File(...)):
    """
    Reçoit un PDF, le traite comme UNE connaissance unique :
    - titre = nom du fichier
    - description/type/domaine = générés par IA
    - le PDF est stocké dans Supabase Storage
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF.")

    pdf_bytes = await file.read()
    titre = file.filename.rsplit(".", 1)[0]

    try:
        analyse = analyser_document(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur analyse : {str(e)}")

    chemin_stockage = f"{uuid.uuid4()}_{file.filename}"
    try:
        supabase.storage.from_(PDF_BUCKET).upload(
            chemin_stockage,
            pdf_bytes,
            {"content-type": "application/pdf"}
        )
        fichier_url = supabase.storage.from_(PDF_BUCKET).get_public_url(chemin_stockage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur stockage PDF : {str(e)}")

    return {
        "titre": titre,
        "description": analyse.get("description", ""),
        "type": analyse.get("type", "donnee"),
        "domaine": analyse.get("domaine", "—"),
        "fichier_url": fichier_url,
    }


@router.post("/save")
async def save_knowledge(knowledge: KnowledgeCreate):
    score = knowledge.score
    meta = calculer_meta(score)

    data = {
        "titre": knowledge.titre,
        "description": knowledge.description,
        "type": knowledge.type,
        "domaine": knowledge.domaine,
        "score": score,
        "scores_detail": knowledge.scores_detail.model_dump(),
        "decision": meta["decision"],
        "rev_est": meta["rev_est"],
        "cost_est": meta["cost_est"],
        "delai": meta["delai"],
        "statut_jur": meta["statut_jur"],
        "maturite": meta["maturite"],
        "fichier_url": knowledge.fichier_url,   # ← nouveau
    }

    try:
        result = supabase.table("knowledges").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"message": "Connaissance enregistrée.", "data": result.data[0]}


@router.get("/")
async def get_all_knowledges():
    try:
        result = supabase.table("knowledges").select("*").order("score", desc=True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")
    return {"knowledges": result.data}


@router.get("/{knowledge_id}")
async def get_knowledge(knowledge_id: int):
    try:
        result = supabase.table("knowledges").select("*").eq("id", knowledge_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Connaissance introuvable.")
    return result.data[0]


@router.delete("/{knowledge_id}")
async def delete_knowledge(knowledge_id: int):
    try:
        supabase.table("knowledges").delete().eq("id", knowledge_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")
    return {"message": "Connaissance supprimée."}
