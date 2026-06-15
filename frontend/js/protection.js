import { getAllKnowledges, saveProtection, getAllProtections } from "./api.js";
import { toast } from "./utils.js";

const PROTS = {
  invention: { title: "Brevet d'invention",                  desc: "Protection de 20 ans. Requiert nouveauté, activité inventive et application industrielle.", orgs: ["INAPI", "OEB", "OMPI"] },
  logiciel:  { title: "Droit d'auteur + brevet logiciel",    desc: "Le code source est protégé automatiquement. L'algorithme peut être breveté s'il produit un effet technique.",  orgs: ["ONDA", "INAPI", "OMPI"] },
  base:      { title: "Droit sui generis (bases de données)", desc: "Protection couvrant l'investissement substantiel dans la base. Durée : 15 ans renouvelables.",                   orgs: ["ONDA", "INAPI"] },
  marque:    { title: "Marque déposée",                       desc: "Protège le nom, logo ou signe distinctif. Valable 10 ans renouvelables.",                                        orgs: ["INAPI", "OMPI"] },
  design:    { title: "Dessin ou modèle industriel",          desc: "Protège l'apparence visuelle d'un produit ou interface. Valable 5 à 25 ans.",                                    orgs: ["INAPI", "OMPI"] },
  secret:    { title: "Secret commercial + NDA",              desc: "Protection par accords de confidentialité. Durée illimitée si le secret est maintenu.",                          orgs: ["NDA interne", "Contrats"] },
};

const TYPE_TO_PROT = {
  logiciel:    "logiciel",
  invention:   "invention",
  base:        "base",
  "savoir-faire": "secret",
  methode:     "invention",
  donnee:      "base",
};

const STATUT_LABELS = ["En préparation", "Déposé — en attente", "En cours d'examen", "Accordé / Enregistré"];

// ─── Init ─────────────────────────────────────────────────────────────────────
export async function initProtection() {
  await loadKnowledgesSelect();
  await renderSavedProtections();

  document.getElementById("prot-kb-select").addEventListener("change", onKbSelect);
  document.getElementById("prot-type").addEventListener("change", updateProtectionBox);
  document.getElementById("prot-status").addEventListener("change", (e) => updateTimeline(e.target.value));
  document.getElementById("btn-save-prot").addEventListener("click", handleSaveProt);
}

// ─── Charger les connaissances dans le select ─────────────────────────────────
async function loadKnowledgesSelect() {
  const select = document.getElementById("prot-kb-select");
  select.innerHTML = `<option value="">-- Choisir depuis la base --</option>`;

  const empty = document.getElementById("prot-empty");
  const main  = document.getElementById("prot-main");

  let knowledges = [];
  try {
    const data = await getAllKnowledges();
    knowledges = data.knowledges || [];
  } catch (err) {
    console.error(err);
  }

  if (knowledges.length === 0) {
    empty.style.display = "block";
    main.style.display  = "none";
    return;
  }

  empty.style.display = "none";
  main.style.display  = "block";

  knowledges.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k.id;
    opt.textContent = `${k.titre}  (score : ${k.score}/30)`;
    opt.dataset.type = k.type;
    opt.dataset.desc = k.description;
    opt.dataset.score = k.score;
    select.appendChild(opt);
  });
}

// ─── Sélection d'une connaissance ─────────────────────────────────────────────
function onKbSelect() {
  const select = document.getElementById("prot-kb-select");
  const opt    = select.selectedOptions[0];
  const info   = document.getElementById("prot-kb-info");

  if (!opt.value) { info.style.display = "none"; return; }

  const score = parseInt(opt.dataset.score);
  let dcls = "danger", dtxt = "Conservation interne";
  if (score > 20) { dcls = "success"; dtxt = "Protéger & commercialiser"; }
  else if (score > 10) { dcls = "warning"; dtxt = "Analyse complémentaire"; }

  document.getElementById("pki-name").textContent  = opt.text.split("(score")[0].trim();
  document.getElementById("pki-desc").textContent  = opt.dataset.desc || "";
  document.getElementById("pki-score").textContent = `${score}/30`;
  document.getElementById("pki-dec").className     = `badge badge-${dcls}`;
  document.getElementById("pki-dec").textContent   = dtxt;
  info.style.display = "block";

  // Suggestion automatique du mode de protection
  const suggested = TYPE_TO_PROT[opt.dataset.type] || "";
  document.getElementById("prot-type").value = suggested;
  if (suggested) updateProtectionBox();
}

// ─── Boîte de protection ──────────────────────────────────────────────────────
function updateProtectionBox() {
  const val = document.getElementById("prot-type").value;
  const box = document.getElementById("prot-result");
  if (!val) { box.style.display = "none"; return; }

  const p = PROTS[val];
  document.getElementById("prot-title-txt").textContent = p.title;
  document.getElementById("prot-desc-txt").textContent  = p.desc;
  document.getElementById("prot-orgs").innerHTML =
    p.orgs.map((o) => `<span class="org-tag">${o}</span>`).join("");
  box.style.display = "block";
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export function updateTimeline(step) {
  const s = parseInt(step);
  for (let i = 0; i <= 3; i++) {
    const dot = document.getElementById(`tl${i}`);
    if (!dot) continue;
    dot.className = "tl-dot";
    if (i < s) dot.classList.add("done");
    else if (i === s) dot.classList.add("active-dot");
  }
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────
async function handleSaveProt() {
  const kb_id = document.getElementById("prot-kb-select").value;
  const type  = document.getElementById("prot-type").value;

  if (!kb_id) { toast("⚠ Veuillez sélectionner une connaissance."); return; }
  if (!type)  { toast("⚠ Veuillez choisir un mode de protection."); return; }

  const p = PROTS[type];
  const payload = {
    knowledge_id: parseInt(kb_id),
    mode:         p.title,
    organisme:    p.orgs[0],
    date_depot:   document.getElementById("prot-date").value   || "—",
    num_dossier:  document.getElementById("prot-num").value    || "—",
    statut_proc:  document.getElementById("prot-status").value || "0",
  };

  try {
    await saveProtection(payload);
    toast("✓ Protection enregistrée en base !");
    await renderSavedProtections();
  } catch (err) {
    toast("Erreur : " + err.message);
  }
}

// ─── Tableau des protections sauvegardées ─────────────────────────────────────
async function renderSavedProtections() {
  const sec   = document.getElementById("prot-saved-section");
  const tbody = document.getElementById("prot-saved-tbody");

  let protections = [];
  try {
    const data = await getAllProtections();
    protections = data.protections || [];
  } catch (err) {
    console.error(err);
  }

  if (protections.length === 0) { sec.style.display = "none"; return; }

  sec.style.display = "block";
  tbody.innerHTML = "";

  protections.forEach((p) => {
    const s   = parseInt(p.statut_proc);
    const cls = s === 3 ? "success" : s >= 1 ? "warning" : "info";
    const titre = p.knowledges?.titre || "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-name">${titre}</td>
      <td>${p.mode}</td>
      <td style="color:var(--text-muted);">${p.date_depot}</td>
      <td style="color:var(--text-muted);">${p.num_dossier}</td>
      <td><span class="badge badge-${cls}">${STATUT_LABELS[s] || "—"}</span></td>`;
    tbody.appendChild(tr);
  });
}
