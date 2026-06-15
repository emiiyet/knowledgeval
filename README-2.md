# KnowledgeVal — Système de valorisation des connaissances

Application web permettant d'évaluer, suivre et protéger juridiquement les connaissances générées par des systèmes IA (chatbot, système à base de connaissances).

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | HTML / CSS / JavaScript |
| Backend | Python · FastAPI |
| Base de données | Supabase (PostgreSQL) |
| IA | Claude API (Anthropic) |
| Déploiement | Render (backend) · GitHub |

## Fonctionnalités

- **Micro-service 1** — Import PDF + extraction automatique des connaissances par IA + évaluation multicritère (grille de notation)
- **Micro-service 2** — Tableau de bord de suivi (revenus, coûts, maturité, statut juridique)
- **Micro-service 3** — Protection juridique (choix du mode, dépôt, suivi)

## Structure du projet

```
knowledgeval/
├── backend/
│   ├── main.py              ← Point d'entrée FastAPI
│   ├── db.py                ← Connexion Supabase
│   ├── routes/
│   │   ├── knowledges.py    ← Endpoints évaluation
│   │   └── protections.py   ← Endpoints protection
│   ├── services/
│   │   └── claude.py        ← Appel API Claude
│   ├── requirements.txt
│   └── .env                 ← (non versionné)
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── evaluation.js
        ├── dashboard.js
        └── protection.js
```

## Installation locale

### 1. Cloner le projet
```bash
git clone https://github.com/ton-username/knowledgeval.git
cd knowledgeval
```

### 2. Configurer le backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Remplir les clés dans .env
```

### 3. Lancer le backend
```bash
uvicorn main:app --reload --port 8000
```

### 4. Lancer le frontend
Ouvrir `frontend/index.html` avec **Live Server** (VS Code) ou un serveur local.

## Variables d'environnement

Copier `.env.example` en `.env` et remplir :

```
ANTHROPIC_API_KEY=   ← Clé API Anthropic
SUPABASE_URL=        ← URL du projet Supabase
SUPABASE_KEY=        ← Clé anon/service Supabase
FRONTEND_URL=        ← URL du frontend (pour CORS)
```

## Déploiement

- **Backend** → Render (Web Service, Python, `uvicorn main:app --host 0.0.0.0 --port $PORT`)
- **Variables d'env** → à configurer dans le dashboard Render
- **Frontend** → GitHub Pages ou serveur statique
