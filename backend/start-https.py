import os
import ssl
import uvicorn
from pathlib import Path

# Generate self-signed certificate if not exists
cert_dir = Path("./certs")
cert_dir.mkdir(exist_ok=True)
cert_path = cert_dir / "server.crt"
key_path = cert_dir / "server.key"

if not cert_path.exists() or not key_path.exists():
    print("Generating self-signed certificate...")
    os.system(f'openssl req -x509 -newkey rsa:4096 -nodes -out {cert_path} -keyout {key_path} -days 365 -subj "/CN=localhost"')

# Run FastAPI with HTTPS
if __name__ == "__main__":
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
    
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile=str(key_path),
        ssl_certfile=str(cert_path)
    )
