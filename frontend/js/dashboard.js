import { getAllKnowledges } from "./api.js";

const MAT_COLS  = { Commerciale: "var(--success)", Pilote: "var(--accent)", Prototype: "var(--warning)", Idée: "var(--danger)" };
const MAT_BADGE = { Commerciale: "success", Pilote: "info", Prototype: "warning", Idée: "danger" };
const SJ_BADGE  = { Brevetée: "success", Protégée: "info", "En cours": "warning", "En analyse": "warning", "Non protégée": "danger" };

export async function renderDashboard() {
  const loading = document.getElementById("dash-loading");
  const empty   = document.getElementById("dash-empty");
  const table   = document.getElementById("dash-table");

  loading.style.display = "block";
  empty.style.display   = "none";
  table.style.display   = "none";

  let knowledges = [];
  try {
    const data = await getAllKnowledges();
    knowledges = data.knowledges || [];
  } catch (err) {
    console.error("Erreur dashboard :", err);
  } finally {
    loading.style.display = "none";
  }

  if (knowledges.length === 0) {
    empty.style.display = "block";
    updateKPIs([], []);
    return;
  }

  table.style.display = "block";
  updateKPIs(knowledges);
  renderTable(knowledges);
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function updateKPIs(knowledges) {
  const strong = knowledges.filter((k) => k.score > 20).length;
  let totalRev = 0, totalCost = 0;

  knowledges.forEach((k) => {
    const rev  = parseInt(k.rev_est);
    const cost = parseInt(k.cost_est);
    if (!isNaN(rev))  totalRev  += rev;
    if (!isNaN(cost)) totalCost += cost;
  });

  document.getElementById("kpi-rev").textContent   = totalRev  ? totalRev.toLocaleString("fr-FR")  + " €" : "0 €";
  document.getElementById("kpi-cost").textContent  = totalCost ? totalCost.toLocaleString("fr-FR") + " €" : "0 €";
  document.getElementById("kpi-count").textContent = knowledges.length;
  document.getElementById("kpi-strong").textContent = strong;
}

// ─── Tableau ──────────────────────────────────────────────────────────────────
function renderTable(knowledges) {
  const tbody = document.getElementById("dash-tbody");
  tbody.innerHTML = "";

  knowledges.forEach((k) => {
    const sjb  = SJ_BADGE[k.statut_jur]  || "danger";
    const matb = MAT_BADGE[k.maturite]   || "danger";
    const matc = MAT_COLS[k.maturite]    || "var(--danger)";
    const pct  = Math.round((k.score / 30) * 100);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-name">${k.titre}</td>
      <td><span class="badge badge-accent">${k.domaine}</span></td>
      <td style="font-weight:700;color:var(--accent);">${k.score}/30</td>
      <td style="color:var(--success);font-weight:500;">${k.rev_est}</td>
      <td style="color:var(--danger);">${k.cost_est}</td>
      <td style="color:var(--text-muted);">${k.delai}</td>
      <td><span class="badge badge-${sjb}">${k.statut_jur}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="prog-wrap">
            <div class="prog-fill" style="width:${pct}%;background:${matc};"></div>
          </div>
          <span class="badge badge-${matb}">${k.maturite}</span>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}
