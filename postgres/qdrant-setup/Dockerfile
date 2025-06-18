# Qdrant Dockerfile
# This Dockerfile runs a standalone Qdrant vector database server

FROM qdrant/qdrant:latest

# Expose default Qdrant port
EXPOSE 6333

# Optionally, mount a volume for persistent storage (when running the container)
# Example usage:
#   docker build -t myqdrant .
#   docker run -d -p 6333:6333 -v $(pwd)/qdrant_data:/qdrant/storage myqdrant

CMD ["/qdrant/qdrant"]
