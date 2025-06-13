# LocalAI RAG Backend

This repository contains a modular backend service for Retrieval-Augmented Generation (RAG) applications, designed to ingest, process, and retrieve documents from various sources.

## Project Structure

```
backend/
├── api/                       # App FastAPI principale
│   ├── main.py               # Point d'entrée et configuration FastAPI
│   └── router/               # Définitions des routes API
│       ├── source_router.py  # Routes pour ingestion/gestion des sources
│       ├── chat_router.py    # Routes pour les interactions de chat
│       ├── ingest_router.py  # Routes pour ingestion de documents
│       └── openai_router.py  # Proxy pour requêtes OpenAI
├── core/                     # Configuration (env, logging)
├── adapters/                 # Connecteurs externes
│   ├── imap_adapter.py       # Client IMAP pour emails
│   └── nextcloud_adapter.py  # Client WebDAV pour Nextcloud
├── services/                 # Logique applicative
│   ├── auth/                 # Services d'authentification
│   │   ├── google_auth.py    # OAuth2 pour Google (Gmail, Drive)
│   │   ├── microsoft_auth.py # OAuth2 pour Microsoft (Outlook)
│   │   └── credentials_manager.py # Gestion des tokens
│   ├── documents/
│   │   └── document_processor.py # Traitement de documents
│   ├── embeddings/
│   │   └── embedding_service.py # Génération d'embeddings
│   ├── rag/
│   │   └── rag_service.py    # Service principal RAG 
│   ├── storage/
│   │   └── file_registry.py  # Registre pour suivi de fichiers
│   └── vectorstore/
│       └── vectorstore_manager.py # Interface Qdrant
└── workers/                   # Traitement asynchrone
    ├── email_ingestion_worker.py # Ingestion d'emails en arrière-plan
    └── nextcloud_ingestion_worker.py # Sync Nextcloud en arrière-plan
```

## Principales Fonctionnalités

### Sources de Documents
- **Nextcloud**: Indexation récursive avec détection de modifications via hashes SHA-256
- **Gmail**: Récupération et indexation via OAuth2 et API Gmail
- **Outlook**: Support via OAuth2 et MS Graph API
- **IMAP**: Support pour serveurs IMAP génériques
- **Upload**: Téléversement direct de fichiers via API REST

### Traitement de Documents
- Support multi-format: PDF, DOCX, HTML, Markdown, EPUB, CSV, PPT, XLSX, emails (EML)
- Chunking intelligent avec métadonnées préservées
- Système de registre pour éviter les ingestions redondantes
- Calcul de hash SHA-256 pour détection de modifications

### Embeddings et Recherche
- Support multi-fournisseurs (OpenAI, Hugging Face)
- Gestion de batch pour optimisation des requêtes
- Logique de retry et failover
- Recherche hybride (sémantique et par mots-clés)
- Filtrage par métadonnées (source, type, utilisateur)

## Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the root directory with the necessary environment variables.

```
# Example .env file
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://localhost:6333
...
```

## Running the Application

```bash
uvicorn backend.api.main:app --reload
```

## Docker Deployment

```bash
docker-compose up -d
```
