import { extractFromPDF, saveKnowledge } from "./api.js";
import { toast } from "./utils.js";

// ─── État ─────────────────────────────────────────────────────────────────────
let extracted = [];
let currentIdx = 0;
let allScores = [];

const CRITERIA = [
  { id: "c1", label: "Valeur économique",     desc: "Peut-elle générer des revenus ou réduire des coûts ?" },
  { id: "c2", label: "Potentiel de marché",    desc: "Existe-t-il une demande ou un usage identifiable ?" },
  { id: "c3", label: "Avantage concurrentiel", desc: "Donne-t-elle un avantage durable à l'organisation ?" },
  { id: "c4", label: "Protégeabilité",         desc: "Peut-elle être protégée par brevet ou droit d'auteur ?" },
  { id: "c5", label: "Facilité de transfert",  desc: "Peut-elle être diffusée ou licenciée facilement ?" },
  { id: "c6", label: "Risque juridique",       desc: "Peut-on la commercialiser sans risque de poursuite ?" },
];

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initEvaluation() {
  const dropZone = document.getElementById("drop-zone");
  const pdfInput = document.getElementById("pdf-input");

  dropZone.addEventListener("click", () => pdfInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--accent)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--border)";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handleFile(file);
    else toast("⚠ Veuillez déposer un fichier PDF.");
  });
  pdfInput.addEventListener("change", () => handleFile(pdfInput.files[0]));

  document.getElementById("btn-extract").addEventListener("click", handleExtract);
  document.getElementById("btn-prev").addEventListener("click", () => navigateTo(currentIdx - 1));
  document.getElementById("btn-next").addEventListener("click", handleSaveAndNext);
  document.getElementById("btn-new-doc").addEventListener("click", resetEvaluation);
  document.getElementById("btn-go-dashboard").addEventListener("click", () => {
    document.getElementById("nav-p2").click();
  });
}

// ─── Gestion fichier ──────────────────────────────────────────────────────────
function handleFile(file) {
  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = (file.size / 1024).toFixed(1) + " Ko";
  document.getElementById("file-info").style.display = "block";
  // Stocker le fichier pour l'envoi
  document.getElementById("pdf-input")._file = file;
}

// ─── Extraction ───────────────────────────────────────────────────────────────
async function handleExtract() {
  const file = document.getElementById("pdf-input")._file;
  if (!file) { toast("⚠ Veuillez d'abord charger un PDF."); return; }

  show("st-loading");
  hide("file-info");

  const messages = [
    "Analyse du document PDF…",
    "Identification des connaissances clés…",
    "Évaluation du potentiel économique…",
    "Finalisation de l'extraction…",
  ];
  let mi = 0;
  const msgEl = document.getElementById("loading-msg");
  const iv = setInterval(() => { msgEl.textContent = messages[++mi % messages.length]; }, 1800);

  try {
    const data = await extractFromPDF(file);
    extracted = data.connaissances;
  } } catch (err) {
    clearInterval(iv);
    hide("st-loading");
    show("file-info");
    toast("Erreur extraction : " + err.message);
    return; // ← stopper ici, ne pas continuer avec des données fictives
} finally {
    clearInterval(iv);
  }

  hide("st-loading");
  allScores = extracted.map(() => ({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0 }));
  renderExtractedList();
  buildCriteriaGrid();
  navigateTo(0);
  show("st-extracted");
  show("st-eval");
}

// ─── Liste des connaissances extraites ───────────────────────────────────────
function renderExtractedList() {
  const list = document.getElementById("extracted-list");
  list.innerHTML = "";
  extracted.forEach((k, i) => {
    const div = document.createElement("div");
    div.className = "card k-card";
    div.id = `kcard-${i}`;
    div.onclick = () => navigateTo(i);
    div.innerHTML = `
      <div class="k-card-num">${i + 1}</div>
      <div class="k-card-info">
        <strong>${k.titre}</strong>
        <span>${k.domaine} · ${k.type}</span>
      </div>
      <span class="badge badge-accent" id="badge-k${i}">À évaluer</span>`;
    list.appendChild(div);
  });
}

// ─── Grille de critères ───────────────────────────────────────────────────────
function buildCriteriaGrid() {
  const grid = document.getElementById("criteria-grid");
  grid.innerHTML = "";
  CRITERIA.forEach((c) => {
    const row = document.createElement("div");
    row.className = "criterion-row";
    row.innerHTML = `
      <div class="criterion-info">
        <strong>${c.label}</strong>
        <span>${c.desc}</span>
      </div>
      <div class="stars" id="stars-${c.id}">
        ${[1, 2, 3, 4, 5].map((n) => `<div class="star" data-val="${n}">${n}</div>`).join("")}
      </div>`;
    grid.appendChild(row);
    // Événements clics étoiles
    row.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        setScore(c.id, parseInt(star.dataset.val));
      });
    });
  });
}

// ─── Navigation entre connaissances ──────────────────────────────────────────
function navigateTo(idx) {
  currentIdx = idx;
  const k = extracted[idx];
  document.getElementById("eval-kname").textContent = k.titre;
  document.getElementById("eval-kdesc").textContent = k.description;

  // Restaurer les scores sauvegardés
  const saved = allScores[idx];
  CRITERIA.forEach((c) => {
    document.querySelectorAll(`#stars-${c.id} .star`).forEach((s, i) => {
      s.classList.toggle("active", i < (saved[c.id] || 0));
    });
  });

  // Surligner la carte active
  extracted.forEach((_, i) => {
    const card = document.getElementById(`kcard-${i}`);
    if (card) card.style.borderColor = i === idx ? "var(--accent)" : "var(--border)";
  });

  document.getElementById("btn-prev").disabled = idx === 0;
  document.getElementById("btn-next").textContent =
    idx === extracted.length - 1 ? "✓ Terminer & Enregistrer" : "Enregistrer → Suivante";

  updateScoreDisplay();
}

// ─── Score ────────────────────────────────────────────────────────────────────
function setScore(criterionId, val) {
  allScores[currentIdx][criterionId] = val;
  document.querySelectorAll(`#stars-${criterionId} .star`).forEach((s, i) => {
    s.classList.toggle("active", i < val);
  });
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const s = allScores[currentIdx] || {};
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  const filled = Object.values(s).filter((v) => v > 0).length;

  document.getElementById("score-txt").textContent = `${total} / 30`;
  document.getElementById("count-val").textContent = `${filled} / 6`;

  const bar = document.getElementById("score-bar");
  bar.style.width = Math.round((total / 30) * 100) + "%";

  const badge = document.getElementById("interp-badge");
  if (total === 0) {
    bar.style.background = "#aaa";
    badge.innerHTML = `<span class="badge badge-info">—</span>`;
  } else if (total <= 10) {
    bar.style.background = "var(--danger)";
    badge.innerHTML = `<span class="badge badge-danger">Conservation interne</span>`;
  } else if (total <= 20) {
    bar.style.background = "var(--warning)";
    badge.innerHTML = `<span class="badge badge-warning">Analyse complémentaire</span>`;
  } else {
    bar.style.background = "var(--success)";
    badge.innerHTML = `<span class="badge badge-success">Protéger & commercialiser</span>`;
  }
}

// ─── Sauvegarde + navigation ──────────────────────────────────────────────────
async function handleSaveAndNext() {
  const s = allScores[currentIdx];
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  const k = extracted[currentIdx];

  // Badge sur la carte
  const badge = document.getElementById(`badge-k${currentIdx}`);
  if (badge) {
    if (total <= 10) { badge.className = "badge badge-danger";  badge.textContent = "Faible"; }
    else if (total <= 20) { badge.className = "badge badge-warning"; badge.textContent = "Moyen"; }
    else { badge.className = "badge badge-success"; badge.textContent = "Fort"; }
  }

  if (currentIdx < extracted.length - 1) {
    navigateTo(currentIdx + 1);
  } else {
    // Dernière connaissance → tout sauvegarder en base
    await saveAllToDatabase();
  }
}

async function saveAllToDatabase() {
  let saved = 0;
  for (let i = 0; i < extracted.length; i++) {
    const k = extracted[i];
    const sc = allScores[i];
    const total = Object.values(sc).reduce((a, b) => a + b, 0);
    try {
      await saveKnowledge({
        titre: k.titre,
        description: k.description,
        type: k.type,
        domaine: k.domaine,
        score: total,
        scores_detail: sc,
        decision: "",
      });
      saved++;
    } catch (err) {
      console.error(`Erreur sauvegarde "${k.titre}" :`, err);
    }
  }
  toast(`✓ ${saved} connaissance(s) enregistrée(s) en base !`);
  showRecap();
}

// ─── Récapitulatif ────────────────────────────────────────────────────────────
function showRecap() {
  const tbody = document.getElementById("recap-tbody");
  tbody.innerHTML = "";
  extracted.forEach((k, i) => {
    const total = Object.values(allScores[i]).reduce((a, b) => a + b, 0);
    let cls = "danger", dec = "Conservation interne";
    if (total > 20) { cls = "success"; dec = "Protéger & commercialiser"; }
    else if (total > 10) { cls = "warning"; dec = "Analyse complémentaire"; }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-name">${k.titre}</td>
      <td><span class="badge badge-accent">${k.domaine}</span></td>
      <td style="font-weight:700;color:var(--accent);">${total}/30</td>
      <td><span class="badge badge-${cls}">${dec}</span></td>`;
    tbody.appendChild(tr);
  });
  hide("st-eval");
  show("st-recap");
  document.getElementById("st-recap").scrollIntoView({ behavior: "smooth" });
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetEvaluation() {
  extracted = []; currentIdx = 0; allScores = [];
  ["st-loading", "st-extracted", "st-eval", "st-recap"].forEach(hide);
  hide("file-info");
  document.getElementById("pdf-input").value = "";
  document.getElementById("drop-zone").style.borderColor = "var(--border)";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).style.display = "block"; }
function hide(id) { document.getElementById(id).style.display = "none"; }
