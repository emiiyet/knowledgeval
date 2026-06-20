import { extractDocument, saveKnowledge } from "./api.js";
import { toast } from "./utils.js";

// ... état et CRITERIA inchangés ...

async function handleExtract() {
  const file = document.getElementById("pdf-input")._file;
  if (!file) { toast("⚠ Veuillez d'abord charger un PDF."); return; }

  show("st-loading");
  hide("file-info");

  const messages = [
    "Analyse du document PDF…",
    "Évaluation du potentiel économique…",
    "Finalisation…",
  ];
  let mi = 0;
  const msgEl = document.getElementById("loading-msg");
  const iv = setInterval(() => { msgEl.textContent = messages[++mi % messages.length]; }, 1800);

  try {
    const data = await extractDocument(file);
    extracted = [data]; // le PDF entier = une seule connaissance
  } catch (err) {
    clearInterval(iv);
    hide("st-loading");
    show("file-info");
    toast("Erreur extraction : " + err.message);
    return;
  } finally {
    clearInterval(iv);
  }

  hide("st-loading");
  allScores = extracted.map(() => ({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0 }));
  buildCriteriaGrid();
  navigateTo(0);
  show("st-eval"); // on saute l'étape "liste de connaissances", il n'y en a qu'une
}
