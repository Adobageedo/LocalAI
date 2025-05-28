# RAG Frontend

Interface React pour la gestion des documents, emails et requêtes IA de ta plateforme RAG.

## Fonctionnalités
- Dashboard : vue d'ensemble, stats, derniers documents
- Liste des documents et emails (avec recherche, filtre, suppression)
- Upload de documents
- Interface de prompt IA (question/réponse + attribution des sources)
- Rafraîchissement en temps réel

## Installation

```bash
cd rag-frontend
npm install
npm run dev
```

## Structure du projet
- `src/pages/Dashboard.jsx` : tableau de bord
- `src/pages/Documents.jsx` : gestion des documents/emails
- `src/pages/Prompt.jsx` : interface de requête IA
- `src/components/` : composants réutilisables (DocumentList, PromptForm, etc.)

## Configuration API
Par défaut, l'app attend un backend REST sur `http://localhost:8000/` avec les endpoints :
- `GET /documents` : liste paginée des documents/emails
- `POST /documents` : upload d'un document
- `DELETE /documents/:doc_id` : suppression
- `POST /prompt` : question à l'IA, retourne réponse + sources utilisées

Tu peux adapter l'URL backend dans `src/config.js`.

---

N'hésite pas à demander pour ajouter des fonctionnalités ou adapter le design !
