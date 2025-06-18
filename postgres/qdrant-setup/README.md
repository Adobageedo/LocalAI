# Qdrant Setup

This folder contains resources and instructions for running a local or cloud Qdrant vector database, which is required for the RAG backend.

## Options

### 1. Local Docker Compose (Development)

You can run Qdrant locally using Docker Compose:

```yaml
docker-compose.yml:

version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_data:/qdrant/storage
```

**To start Qdrant locally:**
```bash
docker-compose up -d qdrant
```

This will make Qdrant available at `http://localhost:6333`.

---

### 2. Qdrant Cloud (Production)

- Go to [https://cloud.qdrant.io/](https://cloud.qdrant.io/)
- Create a free cluster.
- Copy your QDRANT_URL and API key.
- Set these in your backend `.env` or Heroku config vars:
  - `QDRANT_URL=https://<your-cluster>.qdrant.cloud:6333`
  - `QDRANT_API_KEY=...`

---

### 3. Managed Qdrant on Railway/Render/Fly.io

You can deploy Qdrant to any cloud VM or managed container platform. Use the same Docker image as above.

---

## Data Persistence
- For local development, data is stored in `./qdrant-setup/qdrant_data`.
- For cloud, data is managed by the provider.

---

## Useful Links
- [Qdrant Docs](https://qdrant.tech/documentation/)
- [Qdrant Cloud](https://cloud.qdrant.io/)
- [Qdrant Docker Hub](https://hub.docker.com/r/qdrant/qdrant)

---

If you need a sample docker-compose file or want to automate cloud provisioning, let me know!
