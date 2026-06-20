from groq import Groq
import os
import io
import json
import pypdf
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def analyser_document(pdf_bytes: bytes) -> dict:
    """Analyse le PDF entier comme une seule connaissance."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    prompt = f"""Analyse ce document dans son ensemble comme une seule connaissance stratégique.
Fournis un objet JSON avec :
- "description" : résumé en 1-2 phrases du contenu et de son intérêt
- "type"        : parmi [invention, logiciel, base, savoir-faire, methode, donnee]
- "domaine"     : domaine applicatif (ex: santé, industrie, IA...)

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans backticks.

Document :
{text[:8000]}"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)
