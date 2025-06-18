"""
Point d'entrée principal de l'API FastAPI.
"""

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from backend.core.logger import log
from backend.core.config import API_V1_STR, PROJECT_NAME
import asyncio
from backend.workers.email_ingestion_worker import email_worker
from backend.workers.nextcloud_ingestion_worker import nextcloud_worker
from backend.workers.gmail_ingestion_worker import gmail_worker

# Créer l'application FastAPI
app = FastAPI(
    title=PROJECT_NAME,
    description="API pour le système RAG LocalAI",
    version="1.0.0",
    openapi_url=f"{API_V1_STR}/openapi.json",
    docs_url=f"{API_V1_STR}/docs",
    redoc_url=f"{API_V1_STR}/redoc",
)

# Configurer les middlewares CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifiez les origines exactes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware pour le logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Générer un ID de requête unique
    request_id = str(int(start_time * 1000))
    log.info(f"Request started: {request.method} {request.url.path} (ID: {request_id})")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        log.info(f"Request completed: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s (ID: {request_id})")
        return response
    except Exception as e:
        log.exception(f"Request failed: {request.method} {request.url.path} - Error: {str(e)} (ID: {request_id})")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

# Importer et inclure les routers
from backend.api.router import (
    openai_router,
    ingest_router,
    nextcloud_router,
    chat_router,
    source_router,
    gmail_router
)

# Inclure les routeurs avec les préfixes centralisés
app.include_router(openai_router.router, prefix=f"{API_V1_STR}")
app.include_router(ingest_router.router, prefix=f"{API_V1_STR}/sources")
app.include_router(nextcloud_router.router, prefix=f"{API_V1_STR}/nextcloud")
app.include_router(chat_router.router, prefix=f"{API_V1_STR}")
app.include_router(source_router.router, prefix=f"{API_V1_STR}")
app.include_router(gmail_router.router, prefix=f"{API_V1_STR}")

@app.get("/")
async def root():
    """
    Route de base pour vérifier que l'API fonctionne
    """
    return {
        "message": "LocalAI RAG Backend API",
        "version": "1.0.0",
        "docs_url": f"{API_V1_STR}/docs"
    }

@app.get(f"{API_V1_STR}/health")
async def health_check():
    """
    Vérification de l'état de l'API
    """
    return {"status": "ok"}

# Événements de démarrage et d'arrêt
@app.on_event("startup")
async def startup_event():
    log.info("Initializing background workers...")
    # Démarrer les workers en arrière-plan
    await email_worker.start()
    await nextcloud_worker.start()
    await gmail_worker.start()
    log.info("Background workers initialized")

@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down background workers...")
    # Arrêter les workers
    await email_worker.stop()
    await nextcloud_worker.stop()
    await gmail_worker.stop()
    log.info("Background workers stopped")

# Point d'entrée pour uvicorn
if __name__ == "__main__":
    import uvicorn
    log.info(f"Starting {PROJECT_NAME}")
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=True)
