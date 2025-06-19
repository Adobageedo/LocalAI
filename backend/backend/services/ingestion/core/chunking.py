# Chargement et découpe de documents

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
import json
import uuid
import zipfile
from backend.core.config import CONFIG
from backend.core.logger import log
from typing import List, Dict, Any
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    # PDF Loaders
    PyPDFLoader,
    UnstructuredPDFLoader,
    # Word Loaders
    Docx2txtLoader, 
    UnstructuredWordDocumentLoader,
    # Text Loaders
    TextLoader,
    # Markdown Loaders
    UnstructuredMarkdownLoader,
    # PowerPoint Loaders
    UnstructuredPowerPointLoader,
    # OpenDocument Loaders
    UnstructuredODTLoader,
    # CSV & Excel Loaders
    CSVLoader,
    UnstructuredExcelLoader
)
from unstructured.partition.email import partition_email
import pandas as pd

# Configuration du logger
logger = log.bind(name="backend.services.ingestion.core.chunking")

def get_supported_extensions():
    """
    Récupère la liste des extensions supportées depuis le fichier de configuration.
    
    Returns:
        set: Ensemble des extensions supportées avec le point devant (.pdf, .docx, etc.)
    """
    try:
        supported_types = CONFIG.get('ingestion', {}).get('supported_types', [])
        logger.info(f"Supported types: {supported_types}")
        # Convertir les types en extensions avec un point devant
        supported_extensions = {ext.lower() for ext in supported_types}

        # Formats LibreOffice/OpenDocument
        if 'ods' in supported_types or 'excel' in supported_types:
            supported_extensions.update({'.ods', '.fods'})

        # Si aucune extension trouvée, utiliser les valeurs par défaut
        if not supported_extensions:
            logger.warning("Aucune extension supportée trouvée dans la configuration, utilisation des valeurs par défaut")
            return {".pdf", ".docx", ".txt", ".md", ".ppt", ".pptx", ".csv", ".json", ".eml", ".xlsx", ".xlsm", ".odt", ".gdoc", ".gsheet", ".gslides"}
            
        return supported_extensions
    except Exception as e:
        logger.warning(f"Erreur lors du chargement des extensions supportées depuis la configuration: {str(e)}")
        return {".pdf", ".docx", ".txt", ".md", ".ppt", ".pptx", ".csv", ".json", ".eml", ".xlsx", ".xlsm", ".odt", ".gdoc", ".gsheet", ".gslides"}

# Charger les extensions supportées depuis la configuration
SUPPORTED_EXTS = get_supported_extensions()


def load_and_split_document(filepath: str, metadata: Dict[str, Any], chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported file type: {ext}")
    
    # Documents PDF
    if ext == ".pdf":
        try:
            loader = PyPDFLoader(filepath)
            docs = loader.load()
        except Exception as e:
            logger.warning(f"Erreur avec PyPDFLoader: {str(e)}. Utilisation de UnstructuredPDFLoader comme fallback.")
            loader = UnstructuredPDFLoader(filepath)
            docs = loader.load()
    
    # Documents Word
    elif ext == ".docx":
        try:
            loader = Docx2txtLoader(filepath)
            docs = loader.load()
        except Exception as e:
            logger.warning(f"Erreur avec Docx2txtLoader: {str(e)}. Utilisation de UnstructuredWordDocumentLoader comme fallback.")
            try:
                loader = UnstructuredWordDocumentLoader(filepath)
                docs = loader.load()
            except Exception as e2:
                logger.warning(f"Erreur avec UnstructuredWordDocumentLoader: {str(e2)}. Utilisation de TextLoader comme dernier recours.")
                loader = TextLoader(filepath, encoding='utf-8')
                docs = loader.load()
    
    # Documents OpenDocument Text
    elif ext == ".odt":
        try:
            logger.info(f"Traitement du document OpenDocument {filepath} avec UnstructuredODTLoader (mode=elements)")
            loader = UnstructuredODTLoader(filepath, mode="elements")
            docs = loader.load()
        except Exception as e:
            logger.warning(f"Erreur avec UnstructuredODTLoader: {str(e)}. Utilisation de TextLoader comme fallback.")
            loader = TextLoader(filepath, encoding='utf-8', autodetect_encoding=True)
            docs = loader.load()
    
    # Fichiers texte brut
    elif ext == ".txt":
        loader = TextLoader(filepath)
        docs = loader.load()
    
    # Fichiers Markdown
    elif ext == ".md":
        try:
            # Essayer d'abord avec UnstructuredMarkdownLoader
            loader = UnstructuredMarkdownLoader(filepath)
            docs = loader.load()
        except Exception as e:
            logger.warning(f"Erreur avec UnstructuredMarkdownLoader: {str(e)}. Utilisation de TextLoader comme fallback.")
            # Fallback sur TextLoader qui est plus simple mais généralement plus robuste
            loader = TextLoader(filepath, encoding='utf-8')
            docs = loader.load()
    
    # Présentations PowerPoint
    elif ext == ".pptx" or ext == ".ppt":
        try:
            loader = UnstructuredPowerPointLoader(filepath)
            docs = loader.load()
        except Exception as e:
            logger.warning(f"Erreur avec UnstructuredPowerPointLoader: {str(e)}. Utilisation de TextLoader comme fallback.")
            loader = TextLoader(filepath, encoding='utf-8')
            docs = loader.load()
    
    # Emails
    elif ext == ".eml":
        # Email : extraction avec unstructured
        elements = partition_email(filename=filepath)
        text = "\n".join([el.text for el in elements if hasattr(el, "text") and el.text])
        docs = [Document(page_content=text)]

    # Fichiers tableurs (Excel, CSV, LibreOffice Calc, etc.)
    elif ext in {".csv", ".xlsx", ".xlsm", ".xls", ".ods", ".fods"}:
        try:
            # Traitement spécifique pour CSV
            if ext == ".csv":
                try:
                    df = pd.read_csv(filepath, encoding='utf-8')
                    text = df.to_csv(index=False)
                except Exception as e_csv:
                    logger.warning(f"Erreur avec pd.read_csv (UTF-8): {str(e_csv)}. Essai avec Latin-1.")
                    try:
                        df = pd.read_csv(filepath, encoding='latin-1')
                        text = df.to_csv(index=False)
                    except Exception as e_csv2:
                        logger.warning(f"Erreur avec pd.read_csv (Latin-1): {str(e_csv2)}. Utilisation de TextLoader.")
                        loader = TextLoader(filepath, encoding='utf-8', autodetect_encoding=True)
                        docs = loader.load()
                        return docs
            # Formats Excel et similaires
            elif ext in {".xlsx", ".xlsm", ".xls"}:
                try:
                    # Utiliser d'abord UnstructuredExcelLoader avec mode="elements" pour une meilleure extraction
                    logger.info(f"Traitement du fichier Excel {filepath} avec UnstructuredExcelLoader (mode=elements)")
                    loader = UnstructuredExcelLoader(filepath, mode="elements")
                    docs = loader.load()
                    return docs
                except Exception as e_unstruct:
                    logger.warning(f"Erreur avec UnstructuredExcelLoader (mode=elements): {str(e_unstruct)}. Essai avec pandas.")
                    try:
                        # Fallback : Essayer de lire toutes les feuilles avec pandas
                        xlsx = pd.ExcelFile(filepath)
                        sheet_names = xlsx.sheet_names
                        all_texts = []
                        
                        for sheet in sheet_names:
                            try:
                                df = pd.read_excel(filepath, sheet_name=sheet)
                                sheet_text = f"### Feuille: {sheet} ###\n{df.to_csv(index=False)}"
                                all_texts.append(sheet_text)
                            except Exception as sheet_error:
                                logger.warning(f"Erreur lors de la lecture de la feuille '{sheet}': {str(sheet_error)}")
                        
                        if all_texts:
                            text = "\n\n".join(all_texts)
                        else:
                            raise Exception("Aucune feuille n'a pu être lue")
                    except Exception as e_excel:
                        logger.warning(f"Erreur avec pd.read_excel: {str(e_excel)}. Dernier recours TextLoader.")
                        loader = TextLoader(filepath, encoding='utf-8', autodetect_encoding=True)
                        docs = loader.load()
                        return docs
            # Formats LibreOffice Calc
            elif ext in {".ods", ".fods"}:
                try:
                    # Pour les fichiers ODS, utiliser UnstructuredExcelLoader avec mode="elements" si possible
                    logger.info(f"Traitement du fichier Calc {filepath} avec UnstructuredExcelLoader (mode=elements)")
                    loader = UnstructuredExcelLoader(filepath, mode="elements")
                    docs = loader.load()
                    return docs
                except Exception as e_unstruct:
                    logger.warning(f"Erreur avec UnstructuredExcelLoader pour ODS: {str(e_unstruct)}. Essai avec pandas+odf.")
                    try:
                        df = pd.read_excel(filepath, engine='odf')
                        text = df.to_csv(index=False)
                    except Exception as e_ods:
                        logger.warning(f"Erreur avec pd.read_excel (ODF): {str(e_ods)}. Utilisation de TextLoader.")
                        loader = TextLoader(filepath, encoding='utf-8', autodetect_encoding=True)
                        docs = loader.load()
                        return docs
            # Créer le document avec le contenu extrait
            docs = [Document(page_content=text)]
            
        except Exception as e:
            logger.warning(f"Erreur avec le traitement tableur: {str(e)}. Utilisation de TextLoader comme fallback.")
            loader = TextLoader(filepath, encoding='utf-8', autodetect_encoding=True)
            docs = loader.load()
    
    # Fichiers Google Drive (gdoc, gsheet, gslides)
    elif ext in {".gdoc", ".gsheet", ".gslides"}:
        try:
            # Les fichiers Google Drive sont des fichiers JSON contenant des métadonnées et l'URL
            with open(filepath, 'r', encoding='utf-8') as f:
                gdoc_data = json.load(f)
            
            # Extraire les informations pertinentes
            title = gdoc_data.get("title", "Document sans titre")
            doc_id = gdoc_data.get("doc_id", "")
            doc_type = {
                ".gdoc": "google_document",
                ".gsheet": "google_spreadsheet",
                ".gslides": "google_presentation"
            }.get(ext, "google_file")
            
            # Créer un document avec les métadonnées
            # Note: Le contenu réel nécessiterait l'API Google Drive pour être récupéré
            text = f"Titre: {title}\nDocument Google Drive ID: {doc_id}\nType: {doc_type}"
            docs = [Document(page_content=text)]
        except Exception as e:
            logger.error(f"Erreur lors du traitement du fichier Google Drive {filepath}: {str(e)}")
            # Créer un document minimal
            docs = [Document(page_content=f"Erreur de traitement du fichier Google Drive")]
    else:
        # Ce cas ne devrait pas se produire car on vérifie si l'extension est supportée au début
        raise ValueError(f"Unsupported file type: {ext}")

    # Map extension to document_type and update metadata
    ext_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt", ".eml": "email", ".csv": "csv", ".xlsx": "xlsx", ".xlsm": "xlsm", ".xls": "xls", ".ods": "ods", ".fods": "fods"}
    doc_type = ext_map.get(ext, ext.lstrip('.'))
    
    # Update the passed metadata with document type
    metadata["document_type"] = doc_type
    
    # Ensure all docs have the correct metadata
    for i, doc in enumerate(docs):
        # Start with the passed metadata and ensure it's a new dictionary
        doc_metadata = metadata.copy()
        # Add document-specific metadata
        doc_metadata["chunk_id"] = i
        doc_metadata["unique_id"] = str(uuid.uuid4())
        doc_metadata["num_chunks"] = len(docs)
        doc_metadata["embedded"] = True
        # Assign the combined metadata to the document
        doc.metadata = doc_metadata

    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap, add_start_index=True)  # track index in original document
    return splitter.split_documents(docs)

def batch_load_and_split_document(filepaths: List[dict], chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
    """
    Charge et découpe une liste de documents en chunks.

    Args:
        filepaths (List[dict]): Liste de dictionnaires contenant tmp_path et metadata des documents à traiter.
        chunk_size (int, optional): Taille d'un chunk. Default est 500.
        chunk_overlap (int, optional): Chevauchement entre les chunks. Default est 100.

    Returns:
        List[str]: Liste de chunks de tous les documents.
    """
    all_chunks = []
    for file_info in filepaths:
        tmp_path = file_info.get("tmp_path")
        metadata = file_info.get("metadata").copy()
        try:
            chunks = load_and_split_document(tmp_path, metadata, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            all_chunks.extend(chunks)
        except Exception as e:
            logger.warning(f"Erreur lors du traitement du fichier {tmp_path}: {str(e)}")

    
    return all_chunks
