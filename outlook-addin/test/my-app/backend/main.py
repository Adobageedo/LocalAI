from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import firebase_admin
from firebase_admin import credentials
import os
import logging
from outlook_routes import outlook_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase (with a fallback for development)
try:
    # Try to initialize with service account
    cred_path = os.environ.get("FIREBASE_CREDENTIALS", "./firebase-credentials.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized with service account")
    else:
        # Initialize without credentials for development
        firebase_admin.initialize_app()
        logger.warning("Firebase initialized without credentials (development mode)")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {str(e)}")
    logger.warning("Continuing without Firebase authentication")

# Create FastAPI app
app = FastAPI(
    title="Outlook Add-in API",
    description="API for the Outlook Add-in",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(outlook_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Outlook Add-in API"}

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Run the server
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, ssl_keyfile="./key.pem", ssl_certfile="./cert.pem")
