import anthropic
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

DEMO_DATA = [
    {
        "titre": "Algorithme de détection d'anomalies",
        "description": "Méthode automatique d'identification d'anomalies dans des flux de données temps réel.",
        "type": "logiciel",
        "domaine": "IA / Industrie"
    },
    {
        "titre": "Modèle de classification sémantique",
        "description": "Classification de documents par apprentissage automatique.",
        "type": "logiciel",
        "domaine": "IA / NLP"
    },
    {
        "titre": "Protocole d'optimisation énergétique",
        "description": "Procédé de réduction de consommation dans les systèmes distribués.",
        "type": "invention",
        "domaine": "Énergie"
    },
    {
        "titre": "Base de connaissances médicales",
        "description": "Règles et données diagnostiques pour l'aide à la décision médicale.",
        "type": "base",
        "domaine": "Santé"
    },
]


def extraire_connaissances(pdf_bytes: bytes) -> list[dict]:
    pdf_base64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    prompt = """Analyse ce document et extrait exactement 4 à 6 connaissances stratégiques
ayant un potentiel économique ou technologique.
Pour chaque connaissance, fournis un objet JSON avec :
- "titre"       : nom court (max 8 mots)
- "description" : explication en 1-2 phrases
- "type"        : parmi [invention, logiciel, base, savoir-faire, methode, donnee]
- "domaine"     : domaine applicatif (ex: santé, industrie, IA...)
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans backticks."""

    pdf_base64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_base64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    raw = message.content[0].text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)
    except Exception as e:
        print(f"[Claude API] Erreur : {e} — utilisation des données de démo")
        return DEMO_DATA
