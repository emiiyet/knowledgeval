const API_URL = window.location.origin + "/api";

export async function extractFromPDF(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/knowledges/extract`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveKnowledge(knowledge) {
  const res = await fetch(`${API_URL}/knowledges/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(knowledge),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllKnowledges() {
  const res = await fetch(`${API_URL}/knowledges/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteKnowledge(id) {
  const res = await fetch(`${API_URL}/knowledges/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveProtection(protection) {
  const res = await fetch(`${API_URL}/protections/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(protection),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllProtections() {
  const res = await fetch(`${API_URL}/protections/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProtection(id, updates) {
  const res = await fetch(`${API_URL}/protections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
