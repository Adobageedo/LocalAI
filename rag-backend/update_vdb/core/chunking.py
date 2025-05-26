# Chargement et découpe de documents

import os
from rag_engine.config import load_config
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from unstructured.partition.email import partition_email
import pandas as pd

SUPPORTED_EXTS = {".pdf", ".docx", ".txt", ".eml", ".csv", ".xlsx", ".xlsm"}


def load_and_split_document(filepath: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported file type: {ext}")
    
    if ext == ".pdf":
        loader = PyPDFLoader(filepath)
        docs = loader.load()
    elif ext == ".docx":
        loader = Docx2txtLoader(filepath)
        docs = loader.load()
    elif ext == ".txt":
        loader = TextLoader(filepath)
        docs = loader.load()
    elif ext == ".eml":
        # Email : extraction avec unstructured
        elements = partition_email(filename=filepath)
        text = "\n".join([el.text for el in elements if hasattr(el, "text") and el.text])
        docs = [Document(page_content=text, metadata={"source_path": os.path.abspath(filepath), "document_type": "email"})]

    elif ext in {".csv", ".xlsx", ".xlsm"}:
        if ext == ".csv":
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
        text = df.to_csv(index=False)
        docs = [Document(page_content=text, metadata={"source_path": os.path.abspath(filepath), "document_type": ext.lstrip('.')})]
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Add absolute path and document_type to metadata for all docs
    abs_path = os.path.abspath(filepath)
    # Map extension to document_type
    ext_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt", ".eml": "email"}
    doc_type = ext_map.get(ext, ext.lstrip('.'))
    for doc in docs:
        if not hasattr(doc, 'metadata') or doc.metadata is None:
            doc.metadata = {}
        doc.metadata["source_path"] = abs_path
        doc.metadata["document_type"] = doc_type

    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap, add_start_index=True)  # track index in original document
    return splitter.split_documents(docs)
