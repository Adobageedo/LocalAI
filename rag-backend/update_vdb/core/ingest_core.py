import sys
import logging
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import yaml
import uuid
from dotenv import load_dotenv
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from core.chunking import load_and_split_document
from langchain.schema import Document
import hashlib
from rag_engine.config import load_config
from sources.file_registry import FileRegistry

load_dotenv()
# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ingest-core")
logging.getLogger("httpx").setLevel(logging.WARNING)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')

def compute_doc_id(filepath):
    stat = os.stat(filepath)
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

def ingest_document(filepath, user, collection=None, doc_id=None, metadata=None, original_filepath=None, original_filename=None):
    """
    Loads, chunks, and uploads a document or email to Qdrant with enriched metadata.
    
    Args:
        filepath: Path to the document file to process
        user: User identifier for metadata
        collection: Name of the Qdrant collection (defaults to user if not provided)
        doc_id: Optional document ID for deduplication
        metadata: Optional dictionary of additional metadata to include
        original_filepath: Optional original file path to store in metadata (useful for temporary files)
        original_filename: Optional original file name to store in metadata
    Note:
        For email ingestion, set collection to user+"eml" in the calling function.
    """
    config = load_config()

    # Initialiser le registre de fichiers
    file_registry = FileRegistry(user)
    logger.info(f"Registre de fichiers chargé: {len(file_registry.registry)} entrées")

    # Default collection to user if not provided
    collection=None
    if collection is None:
        collection = user
    manager = VectorStoreManager(collection)

    ext = os.path.splitext(filepath)[1].lower()
    if doc_id is None:
        doc_id = compute_doc_id(filepath)

    # Vérifier si le document existe déjà dans le registre
    if file_registry:
        if file_registry.file_exists(filepath):
            if not file_registry.has_changed(filepath, doc_id):
                logger.info(f"Document déjà présent dans le registre (inchangé): {filepath}")
                return
            else:
                logger.info(f"Document modifié, réingestion: {filepath}")
                # Supprimer l'ancien document de Qdrant
                old_doc_id = file_registry.get_doc_id(filepath)
                if old_doc_id:
                    logger.info(f"Suppression de l'ancien document: {old_doc_id}")
                    manager.delete_by_doc_id(old_doc_id)
    
    logger.info(f"Ingesting document: {collection}")
    try:
        split_docs = load_and_split_document(filepath)
    except Exception as e:
        logger.error(f"Failed to process after chunking {filepath}: {e}")
        return
    docs_to_upload = []
    for i, doc in enumerate(split_docs):
        # Attach metadata
        if not hasattr(doc, 'metadata') or doc.metadata is None:
            doc.metadata = {}
        
        # Définir les métadonnées de base
        doc.metadata["user"] = user
        doc.metadata["doc_id"] = doc_id  # Always use provided doc_id if given
        
        # Gestion des chemins de fichiers (original ou courant)
        doc.metadata["source_path"] = original_filepath
        
        # Utiliser les informations originales si fournies
        if original_filepath:
            doc.metadata["original_path"] = original_filepath
        else:
            doc.metadata["original_path"] = filepath
            
        # Gestion des noms de fichiers (original ou courant)
        current_filename = os.path.basename(filepath)
        if original_filename:
            doc.metadata["original_filename"] = original_filename
            doc.metadata["attachment_name"] = original_filename
        else:
            doc.metadata["original_filename"] = current_filename
            doc.metadata["attachment_name"] = current_filename
            
        # Ajouter le titre (nom de fichier sans extension) pour la recherche
        doc.metadata["title"] = os.path.splitext(doc.metadata["original_filename"])[0]
            
        # Métadonnées pour le suivi des chunks
        doc.metadata["chunk_id"] = i
        doc.metadata["unique_id"] = str(uuid.uuid4())
        
        # Si custom metadata est fourni, l'ajouter aux métadonnées du document
        if metadata:
            doc.metadata.update(metadata)
            
        # If email, add rich metadata
        if ext == ".eml" or (metadata and metadata.get('document_type') in ['email', 'email_body', 'attachment']):
            # List of standard email metadata fields to ensure they exist
            email_fields = [
                "sender", "receiver", "cc", "bcc", "subject", "date", 
                "message_id", "document_type", "source", "content_type",
                "parent_email_id", "ingest_date"
            ]
            
            # Ensure all email fields exist in metadata
            for key in email_fields:
                if key not in doc.metadata:
                    doc.metadata[key] = None  # Default to None if not present
                    
            # Set document_type if not already set
            if not doc.metadata.get("document_type"):
                doc.metadata["document_type"] = "email"
                
            # Set ingest_date if not already set
            if not doc.metadata.get("ingest_date"):
                from datetime import datetime
                doc.metadata["ingest_date"] = datetime.now().isoformat()
        docs_to_upload.append(doc)
    if docs_to_upload:
        try:
            logger.info(f"Uploading {len(docs_to_upload)} chunks for {original_filepath}")
            manager.add_documents(docs_to_upload)
            logger.info("Upload complete.")
            from datetime import datetime
            # Récupérer les métadonnées du premier document pour les stocker dans le registre
            # Cela permettra à l'API de récupérer les métadonnées sans interroger Qdrant
            doc_metadata = docs_to_upload[0].metadata if docs_to_upload else {}
            
            file_registry.add_file(
                        file_path=original_filepath,
                        doc_id=doc_id,
                        file_hash=doc_id,
                        source_path=original_filepath,
                        last_modified=datetime.now().isoformat(),
                        metadata=doc_metadata
                    )
        except Exception as e:
            logger.error(f"Failed to upload documents: {e}")
        
    else:
        logger.info(f"No chunks to upload for {filepath}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest documents into Qdrant vector database")
    parser.add_argument("--file", help="Path to a specific file to ingest")
    parser.add_argument("--dir", help="Directory containing files to ingest")
    parser.add_argument("--collection", help="Qdrant collection name")
    parser.add_argument("--user", default="system", help="User identifier for metadata")
    parser.add_argument("--doc-type", choices=["email", "pdf", "docx", "txt", "contract"], 
                        help="Document type for metadata")
    args = parser.parse_args()
    
    config = load_config()
    retrieval_cfg = config.get('retrieval', {})
    collection = args.collection or retrieval_cfg.get('vectorstore', {}).get('collection', 'rag_documents1536')
    supported_types = retrieval_cfg.get('supported_types', ["email", "pdf", "contract", "docx", "txt"])
    ext_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt", "email": ".eml"}
    supported_exts = set(ext_map[t] for t in supported_types if t in ext_map)
    
    # Determine files to ingest
    files_to_ingest = []
    
    if args.file:
        if os.path.isfile(args.file):
            files_to_ingest.append(args.file)
        else:
            print(f"File not found: {args.file}")
            return
    elif args.dir:
        if os.path.isdir(args.dir):
            from glob import glob
            for ext in supported_exts:
                files_to_ingest.extend(glob(os.path.join(args.dir, f"**/*{ext}"), recursive=True))
        else:
            print(f"Directory not found: {args.dir}")
            return
    else:
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'documents'))
        print(f"No file or directory specified, using default: {data_dir}")
        
        # Define get_files_from_dir function if it doesn't exist
        def get_files_from_dir(directory, extensions):
            from glob import glob
            files = []
            for ext in extensions:
                files.extend(glob(os.path.join(directory, f"**/*{ext}"), recursive=True))
            return files
            
        files_to_ingest = get_files_from_dir(data_dir, supported_exts)
    
    if not files_to_ingest:
        print("No files found to ingest.")
        return
    
    print(f"Ingesting {len(files_to_ingest)} files into collection '{collection}'")
    
    # Create base metadata
    base_metadata = {
        "user": args.user,
    }
    
    if args.doc_type:
        base_metadata["document_type"] = args.doc_type
    
    # Ingest each file individually
    for filepath in files_to_ingest:
        try:
            print(f"Processing: {filepath}")
            ingest_document(filepath, args.user, collection, metadata=base_metadata)
        except Exception as e:
            print(f"Failed to process {filepath}: {e}")
    
    print("Ingestion complete.")

if __name__ == "__main__":
    main()
