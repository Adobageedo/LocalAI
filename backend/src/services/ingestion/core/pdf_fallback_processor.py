"""
PDF Fallback Processor - Handles problematic PDFs using OCR and GPT Vision

This module provides fallback mechanisms for PDFs that cannot be processed
with standard loaders (PyPDFLoader, UnstructuredPDFLoader).

Fallback chain:
1. PDFMiner.six - Advanced text extraction
2. OCR (Tesseract via pdf2image + pytesseract) - For scanned/image-based PDFs
3. GPT-4 Vision - For complex layouts or when OCR fails
"""

import os
import sys
import base64
import tempfile
from typing import List, Optional, Dict, Any
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from src.core.logger import log
from langchain_core.documents import Document

# Configure logger
logger = log.bind(name="src.services.ingestion.core.pdf_fallback_processor")

# OCR / Vision configuration (tunable via environment variables)
DEFAULT_OCR_LANG = os.getenv("PDF_FALLBACK_OCR_LANG", "fra")  # French by default

def _get_int_env(name: str, default: int) -> int:
    """Safely read an integer from environment variables."""
    try:
        value = os.getenv(name)
        return int(value) if value is not None else default
    except ValueError:
        logger.warning(f"Invalid value for {name}, using default {default}")
        return default

DEFAULT_OCR_DPI = _get_int_env("PDF_FALLBACK_OCR_DPI", 250)
DEFAULT_OCR_MAX_PAGES = _get_int_env("PDF_FALLBACK_OCR_MAX_PAGES", 20)
DEFAULT_VISION_MAX_PAGES = _get_int_env("PDF_FALLBACK_VISION_MAX_PAGES", 10)
DEFAULT_OCR_WORKERS = _get_int_env("PDF_FALLBACK_OCR_WORKERS", max(1, (os.cpu_count() or 4) // 2))


class PDFFallbackProcessor:
    """
    Handles PDF processing with multiple fallback strategies.
    """
    
    def __init__(self):
        """Initialize the PDF fallback processor."""
        self.pdfminer_available = self._check_pdfminer()
        self.ocr_available = self._check_ocr()
        self.vision_available = self._check_vision()
        
        logger.info(f"PDF Fallback Processor initialized - PDFMiner: {self.pdfminer_available}, "
                   f"OCR: {self.ocr_available}, Vision: {self.vision_available}")
    
    def _check_pdfminer(self) -> bool:
        """Check if pdfminer.six is available."""
        try:
            import pdfminer
            return True
        except ImportError:
            logger.warning("pdfminer.six not available. Install with: pip install pdfminer.six")
            return False
    
    def _check_ocr(self) -> bool:
        """Check if OCR dependencies are available."""
        try:
            import pytesseract
            from pdf2image import convert_from_path
            # Test if tesseract is installed
            pytesseract.get_tesseract_version()
            return True
        except (ImportError, Exception) as e:
            logger.warning(f"OCR not available: {e}. Install with: pip install pytesseract pdf2image pillow")
            return False
    
    def _check_vision(self) -> bool:
        """Check if GPT Vision API is available."""
        try:
            # Check if API key is configured
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("OPENAI_API_KEY not set. GPT Vision fallback unavailable.")
                return False
            
            # Check if LLM module is available
            from src.services.llm.llm import LLM
            return True
        except ImportError as e:
            logger.warning(f"LLM module not available: {e}. GPT Vision fallback unavailable.")
            return False
    
    def process_pdf(self, filepath: str, metadata: Dict[str, Any]) -> List[Document]:
        """
        Process a PDF file using fallback strategies.
        
        Args:
            filepath: Path to the PDF file
            metadata: Document metadata
            
        Returns:
            List of Document objects with extracted text
        """
        logger.info(f"Starting fallback processing for: {filepath}")
        
        # Try PDFMiner first
        if self.pdfminer_available:
            try:
                docs = self._extract_with_pdfminer(filepath, metadata)
                if docs and self._is_valid_extraction(docs):
                    logger.info(f"✓ PDFMiner extraction successful for {filepath}")
                    return docs
                else:
                    logger.warning(f"PDFMiner extraction insufficient for {filepath}")
            except Exception as e:
                logger.warning(f"PDFMiner failed for {filepath}: {e}")
        
        # Try OCR if PDFMiner failed
        if self.ocr_available:
            try:
                docs = self._extract_with_ocr(filepath, metadata)
                if docs and self._is_valid_extraction(docs):
                    logger.info(f"✓ OCR extraction successful for {filepath}")
                    return docs
                else:
                    logger.warning(f"OCR extraction insufficient for {filepath}")
            except Exception as e:
                logger.warning(f"OCR failed for {filepath}: {e}")
        
        # Try GPT Vision as last resort
        if self.vision_available:
            try:
                docs = self._extract_with_vision(filepath, metadata)
                if docs and self._is_valid_extraction(docs):
                    logger.info(f"✓ GPT Vision extraction successful for {filepath}")
                    return docs
                else:
                    logger.warning(f"GPT Vision extraction insufficient for {filepath}")
            except Exception as e:
                logger.error(f"GPT Vision failed for {filepath}: {e}")
        
        # All methods failed
        logger.error(f"All fallback methods failed for {filepath}")
        return self._create_error_document(filepath, metadata)
    
    def _extract_with_pdfminer(self, filepath: str, metadata: Dict[str, Any]) -> List[Document]:
        """Extract text using pdfminer.six."""
        from pdfminer.high_level import extract_text
        from pdfminer.layout import LAParams
        
        logger.info(f"Attempting PDFMiner extraction for {filepath}")
        
        # Configure layout analysis parameters
        laparams = LAParams(
            line_overlap=0.5,
            char_margin=2.0,
            line_margin=0.5,
            word_margin=0.1,
            boxes_flow=0.5,
            detect_vertical=True,
            all_texts=False
        )
        
        text = extract_text(filepath, laparams=laparams)
        
        if not text or len(text.strip()) < 50:
            raise ValueError("Insufficient text extracted")
        
        doc_metadata = metadata.copy()
        doc_metadata["extraction_method"] = "pdfminer"
        
        return [Document(page_content=text, metadata=doc_metadata)]
    
    def _extract_with_ocr(self, filepath: str, metadata: Dict[str, Any]) -> List[Document]:
        """Extract text using OCR (Tesseract)."""
        import pytesseract
        from pdf2image import convert_from_path
        from PIL import Image
        
        logger.info(f"Attempting OCR extraction for {filepath}")
        
        # Convert PDF to images (limit number of pages for performance)
        images = convert_from_path(
            filepath,
            dpi=DEFAULT_OCR_DPI,
            fmt='jpeg',
            thread_count=2
            # last_page=DEFAULT_OCR_MAX_PAGES
        )
        
        logger.info(f"Converted PDF to {len(images)} images")
        
        all_text_by_page: List[Optional[str]] = [None] * len(images)

        def _ocr_single_page(page_index: int, image: Image.Image):
            page_num = page_index + 1
            logger.debug(f"Processing page {page_num}/{len(images)}")
            custom_config = r'--oem 3 --psm 6'
            try:
                text = pytesseract.image_to_string(image, lang=DEFAULT_OCR_LANG, config=custom_config)
            except pytesseract.TesseractError as e:
                # If configured language is missing, fall back to English
                if "Failed loading language" in str(e) or "Could not initialize tesseract" in str(e):
                    logger.warning(
                        f"OCR language '{DEFAULT_OCR_LANG}' not available, falling back to 'eng' for page {page_num}"
                    )
                    text = pytesseract.image_to_string(image, lang="eng", config=custom_config)
                else:
                    raise
            
            if text.strip():
                return page_num, f"--- Page {page_num} ---\n{text}"
            return page_num, None

        with ThreadPoolExecutor(max_workers=DEFAULT_OCR_WORKERS) as executor:
            futures = [
                executor.submit(_ocr_single_page, i, image)
                for i, image in enumerate(images)
            ]
            for future in as_completed(futures):
                page_num, text_block = future.result()
                if text_block:
                    all_text_by_page[page_num - 1] = text_block

        all_text = [t for t in all_text_by_page if t]
        combined_text = "\n\n".join(all_text)
        
        if not combined_text or len(combined_text.strip()) < 50:
            raise ValueError("Insufficient text extracted via OCR")
        
        doc_metadata = metadata.copy()
        doc_metadata["extraction_method"] = "ocr"
        doc_metadata["ocr_pages"] = len(images)
        
        return [Document(page_content=combined_text, metadata=doc_metadata)]
    
    def _extract_with_vision(self, filepath: str, metadata: Dict[str, Any]) -> List[Document]:
        """Extract text using GPT-4 Vision API via LLM service."""
        from pdf2image import convert_from_path
        from src.services.llm.llm import LLM
        import io
        import asyncio
        
        logger.info(f"Attempting GPT Vision extraction for {filepath}")
        
        # Initialize LLM with vision support
        llm = LLM(temperature=0, max_tokens=4096)
        
        # Convert PDF to images (limit to first N pages to control costs)
        images = convert_from_path(
            filepath,
            dpi=200,  # Lower DPI for Vision API
            fmt='jpeg',
            thread_count=2
            # last_page=DEFAULT_VISION_MAX_PAGES  # Limit pages
        )
        
        logger.info(f"Processing {len(images)} pages with GPT Vision")
        
        async def process_page(image, page_num):
            """Process a single page with vision."""
            logger.debug(f"Processing page {page_num}/{len(images)} with GPT Vision")
            
            # Convert image to base64
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG", quality=85)
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            # Call GPT-4 Vision via LLM service
            prompt = "Extract all text from this document page. Preserve the structure and formatting as much as possible. Return only the extracted text without any commentary."
            
            text = await llm.vision(
                image_base64=img_base64,
                prompt=prompt
            )
            
            if text and text.strip():
                return f"--- Page {page_num} ---\n{text}"
            return None
        
        async def process_all_pages():
            """Process all pages."""
            tasks = [process_page(image, i+1) for i, image in enumerate(images)]
            results = await asyncio.gather(*tasks)
            return [r for r in results if r]
        
        # Run async processing
        all_text = asyncio.run(process_all_pages())
        
        combined_text = "\n\n".join(all_text)
        
        if not combined_text or len(combined_text.strip()) < 50:
            raise ValueError("Insufficient text extracted via GPT Vision")
        
        doc_metadata = metadata.copy()
        doc_metadata["extraction_method"] = "gpt_vision"
        doc_metadata["vision_pages"] = len(images)
        
        return [Document(page_content=combined_text, metadata=doc_metadata)]
    
    def _is_valid_extraction(self, docs: List[Document]) -> bool:
        """
        Check if the extraction is valid (contains meaningful text).
        
        Args:
            docs: List of extracted documents
            
        Returns:
            True if extraction is valid, False otherwise
        """
        if not docs:
            return False
        
        total_text = " ".join([doc.page_content for doc in docs])
        
        # Check minimum length
        if len(total_text.strip()) < 50:
            return False
        
        # Check if it's not just gibberish (at least 50% alphanumeric)
        alphanumeric = sum(c.isalnum() for c in total_text)
        if alphanumeric / len(total_text) < 0.5:
            return False
        
        return True
    
    def _create_error_document(self, filepath: str, metadata: Dict[str, Any]) -> List[Document]:
        """Create an error document when all extraction methods fail."""
        error_text = (
            f"ERREUR: Impossible d'extraire le texte du fichier PDF.\n"
            f"Fichier: {filepath}\n"
            f"Toutes les méthodes d'extraction ont échoué (PyPDF, UnstructuredPDF, PDFMiner, OCR, GPT Vision).\n"
            f"Le fichier peut être corrompu, protégé par mot de passe, ou dans un format non standard."
        )
        
        doc_metadata = metadata.copy()
        doc_metadata["extraction_method"] = "failed"
        doc_metadata["extraction_error"] = True
        
        return [Document(page_content=error_text, metadata=doc_metadata)]


# Singleton instance
_processor_instance = None

def get_pdf_fallback_processor() -> PDFFallbackProcessor:
    """Get or create the singleton PDF fallback processor instance."""
    global _processor_instance
    if _processor_instance is None:
        _processor_instance = PDFFallbackProcessor()
    return _processor_instance
