# API RAG Backend

API REST FastAPI pour connecter le frontend React à la logique documentaire et RAG.

## Lancement rapide

```bash
cd rag-backend/api
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints principaux
- `GET /documents` : liste paginée, recherche
- `POST /documents` : upload de document
- `DELETE /documents/{doc_id}` : suppression
- `POST /prompt` : question à l'IA, réponse + sources utilisées

---

À brancher sur ta logique existante (ingest, suppression, RAG, etc.).
