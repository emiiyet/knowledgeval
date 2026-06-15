from groq import Groq
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extraire_connaissances(pdf_bytes: bytes) -> list[dict]:
    # Extraire le texte du PDF
    import pypdf
    import io
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text()

    prompt = f"""Analyse ce document et extrait exactement 4 à 6 connaissances stratégiques
ayant un potentiel économique ou technologique.
Pour chaque connaissance, fournis un objet JSON avec :
- "titre"       : nom court (max 8 mots)
- "description" : explication en 1-2 phrases
- "type"        : parmi [invention, logiciel, base, savoir-faire, methode, donnee]
- "domaine"     : domaine applicatif (ex: santé, industrie, IA...)
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans backticks.

Document :
{text[:8000]}"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)
