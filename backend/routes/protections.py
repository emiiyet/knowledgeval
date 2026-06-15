from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

router = APIRouter()


# ── Schémas ──────────────────────────────────────────────────────────────────

class ProtectionCreate(BaseModel):
    knowledge_id: int
    mode: str           # Ex: "Brevet d'invention"
    organisme: str      # Ex: "INAPI"
    date_depot: str     # Ex: "2025-06-15" ou "—"
    num_dossier: str    # Ex: "FR2025/00123" ou "—"
    statut_proc: str    # "0" à "3"


class ProtectionUpdate(BaseModel):
    mode: str | None = None
    organisme: str | None = None
    date_depot: str | None = None
    num_dossier: str | None = None
    statut_proc: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/")
async def create_protection(protection: ProtectionCreate):
    """Enregistre une protection juridique pour une connaissance."""

    # Vérifier que la connaissance existe
    try:
        kb = supabase.table("knowledges").select("id, titre").eq("id", protection.knowledge_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    if not kb.data:
        raise HTTPException(status_code=404, detail="Connaissance introuvable.")

    # Supprimer une éventuelle protection existante pour cette connaissance
    supabase.table("protections").delete().eq("knowledge_id", protection.knowledge_id).execute()

    data = {
        "knowledge_id": protection.knowledge_id,
        "mode": protection.mode,
        "organisme": protection.organisme,
        "date_depot": protection.date_depot,
        "num_dossier": protection.num_dossier,
        "statut_proc": protection.statut_proc,
    }

    try:
        result = supabase.table("protections").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    # Mettre à jour le statut juridique dans la table knowledges
    statut_map = {
        "0": "En analyse",
        "1": "En cours",
        "2": "En cours",
        "3": "Brevetée",
    }
    new_statut = statut_map.get(protection.statut_proc, "En analyse")
    supabase.table("knowledges").update({"statut_jur": new_statut}).eq("id", protection.knowledge_id).execute()

    return {"message": "Protection enregistrée.", "data": result.data[0]}


@router.get("/")
async def get_all_protections():
    """
    Retourne toutes les protections avec les infos de la connaissance associée.
    """
    try:
        result = supabase.table("protections").select(
            "*, knowledges(titre, domaine, score, decision)"
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"protections": result.data}


@router.get("/{protection_id}")
async def get_protection(protection_id: int):
    """Retourne une protection par son ID."""
    try:
        result = supabase.table("protections").select(
            "*, knowledges(titre, domaine, score)"
        ).eq("id", protection_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Protection introuvable.")

    return result.data[0]


@router.patch("/{protection_id}")
async def update_protection(protection_id: int, updates: ProtectionUpdate):
    """Met à jour le statut ou les infos d'une protection."""
    data = {k: v for k, v in updates.model_dump().items() if v is not None}

    if not data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour.")

    try:
        result = supabase.table("protections").update(data).eq("id", protection_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    # Sync statut_jur dans knowledges si statut_proc change
    if "statut_proc" in data and result.data:
        statut_map = {"0": "En analyse", "1": "En cours", "2": "En cours", "3": "Brevetée"}
        new_statut = statut_map.get(data["statut_proc"], "En analyse")
        kb_id = result.data[0]["knowledge_id"]
        supabase.table("knowledges").update({"statut_jur": new_statut}).eq("id", kb_id).execute()

    return {"message": "Protection mise à jour.", "data": result.data[0]}


@router.delete("/{protection_id}")
async def delete_protection(protection_id: int):
    """Supprime une protection."""
    try:
        supabase.table("protections").delete().eq("id", protection_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Supabase : {str(e)}")

    return {"message": "Protection supprimée."}
