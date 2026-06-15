from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from db import supabase
from services.claude import extraire_connaissances

router = APIRouter()


# ── Schémas ────────────────────────────────────────────────────────────────

class ScoresDetail(BaseModel):
    c1: int  # Valeur économique
    c2: int  # Potentiel de marché
    c3: int  # Avantage concurrentiel
    c4: int  # Protégeabilité
    c5: int  # Facilité de transfert
    c6: int  # Risque juridique


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


# ── Helpers ─────────────────────────────────────────────────────────────────

def calculer_meta(score: int) -> dict:
    """Calcule revenus estimés, coûts, délai et maturité selon le score."""
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


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/extract")
async def extract_from_pdf(file: UploadFile = File(...)):
    """
    Reçoit un fichier PDF, l'envoie à Claude et retourne
    les connaissances extraites (sans les sauvegarder).
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF.")

    pdf_bytes = await file.read()

    try:
        connaissances = extraire_connaissances(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur extraction Claude : {str(e)}")

    return {"connaissances": connaissances}


@router.post("/save")
async def save_knowledge(knowledge: KnowledgeCreate):
    """Sauvegarde une connaissance évaluée dans Supabase."""
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
    }

    try:
        result = supabase.table("knowledges").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"message": "Connaissance enregistrée.", "data": result.data[0]}


@router.get("/")
async def get_all_knowledges():
    """Retourne toutes les connaissances stockées, triées par score décroissant."""
    try:
        result = supabase.table("knowledges").select("*").order("score", desc=True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"knowledges": result.data}


@router.get("/{knowledge_id}")
async def get_knowledge(knowledge_id: int):
    """Retourne une connaissance par son ID."""
    try:
        result = supabase.table("knowledges").select("*").eq("id", knowledge_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Connaissance introuvable.")

    return result.data[0]


@router.delete("/{knowledge_id}")
async def delete_knowledge(knowledge_id: int):
    """Supprime une connaissance par son ID."""
    try:
        supabase.table("knowledges").delete().eq("id", knowledge_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"message": "Connaissance supprimée."}
