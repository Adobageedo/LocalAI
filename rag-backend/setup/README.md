# Setup Instructions for update_vdb

This folder contains scripts and files to help you set up all dependencies for the update_vdb ingestion system, including Python dependencies and services like Qdrant.

## 1. Python Dependencies

Install all required Python packages:

```bash
pip install -r requirements.txt
```

## 2. Qdrant (Vector Database)

Qdrant is used as the vector database backend. You can launch it with Docker Compose:

```bash
cd setup
# Start Qdrant in the background
sudo docker-compose up -d
```

Qdrant will be available at http://localhost:6333

## 3. Environment Variables

Copy the `.env.example` or create a `.env` file in your project root and configure credentials as needed.

## 4. Other Services

- Add additional service setup instructions here as needed (e.g., Tesseract, OCR, etc.)

## 5. Stopping Qdrant

To stop Qdrant:

```bash
sudo docker-compose down
```

---

For more advanced configuration, see the Qdrant documentation: https://qdrant.tech/
