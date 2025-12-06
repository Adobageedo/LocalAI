"""
Test script for PDF fallback processor

This script tests the PDF fallback processing chain on problematic PDFs.
"""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.services.ingestion.core.pdf_fallback_processor import get_pdf_fallback_processor
from src.services.ingestion.core.chunking import load_and_split_document
from src.core.logger import log

logger = log.bind(name="test_pdf_fallback")


def test_problematic_pdf(pdf_path: str):
    """
    Test the PDF fallback processor on a problematic PDF file.
    
    Args:
        pdf_path: Path to the PDF file to test
    """
    logger.info(f"Testing PDF fallback processor on: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        logger.error(f"File not found: {pdf_path}")
        return
    
    # Create test metadata
    metadata = {
        "path": pdf_path,
        "source": "test",
        "user_id": "test_user"
    }
    
    try:
        # Test the full processing chain (will use fallbacks automatically)
        logger.info("=" * 80)
        logger.info("Testing full processing chain with automatic fallbacks...")
        logger.info("=" * 80)
        
        chunks = load_and_split_document(pdf_path, metadata, chunk_size=1000, chunk_overlap=100)
        
        if chunks:
            logger.info(f"✓ SUCCESS: Generated {len(chunks)} chunks")
            logger.info(f"First chunk preview (200 chars):")
            logger.info(f"{chunks[0].page_content[:200]}...")
            logger.info(f"Extraction method: {chunks[0].metadata.get('extraction_method', 'standard')}")
        else:
            logger.warning("No chunks generated")
            
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        import traceback
        logger.error(traceback.format_exc())


def test_fallback_processor_directly(pdf_path: str):
    """
    Test the fallback processor directly (bypassing standard loaders).
    
    Args:
        pdf_path: Path to the PDF file to test
    """
    logger.info(f"Testing fallback processor directly on: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        logger.error(f"File not found: {pdf_path}")
        return
    
    metadata = {
        "path": pdf_path,
        "source": "test",
        "user_id": "test_user"
    }
    
    try:
        processor = get_pdf_fallback_processor()
        
        logger.info("=" * 80)
        logger.info("Testing fallback processor directly...")
        logger.info("=" * 80)
        
        docs = processor.process_pdf(pdf_path, metadata)
        
        if docs:
            logger.info(f"✓ SUCCESS: Generated {len(docs)} documents")
            for i, doc in enumerate(docs):
                logger.info(f"\nDocument {i+1}:")
                logger.info(f"  Length: {len(doc.page_content)} characters")
                logger.info(f"  Method: {doc.metadata.get('extraction_method', 'unknown')}")
                logger.info(f"  Preview: {doc.page_content[:200]}...")
        else:
            logger.warning("No documents generated")
            
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        import traceback
        logger.error(traceback.format_exc())


def check_dependencies():
    """Check if all required dependencies are installed."""
    logger.info("Checking dependencies...")
    
    dependencies = {
        "pdfminer": "pdfminer.six",
        "pytesseract": "pytesseract",
        "pdf2image": "pdf2image",
        "PIL": "Pillow",
        "openai": "openai"
    }
    
    missing = []
    for module_name, package_name in dependencies.items():
        try:
            __import__(module_name)
            logger.info(f"✓ {package_name} is installed")
        except ImportError:
            logger.warning(f"✗ {package_name} is NOT installed")
            missing.append(package_name)
    
    if missing:
        logger.warning(f"\nMissing dependencies: {', '.join(missing)}")
        logger.info("Install with: pip install " + " ".join(missing))
    else:
        logger.info("\n✓ All dependencies are installed!")
    
    # Check Tesseract binary
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        logger.info(f"✓ Tesseract OCR is installed (version {version})")
    except Exception as e:
        logger.warning(f"✗ Tesseract OCR binary not found: {e}")
        logger.info("Install Tesseract:")
        logger.info("  macOS: brew install tesseract tesseract-lang")
        logger.info("  Ubuntu: sudo apt-get install tesseract-ocr tesseract-ocr-fra")
        logger.info("  Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test PDF fallback processor")
    parser.add_argument("pdf_path", nargs="?", default="input.pdf", help="Path to PDF file to test")
    parser.add_argument("--check-deps", action="store_true", help="Check dependencies only")
    parser.add_argument("--direct", action="store_true", help="Test fallback processor directly")
    
    args = parser.parse_args()
    
    if args.check_deps:
        check_dependencies()
    elif args.pdf_path:
        if args.direct:
            test_fallback_processor_directly(args.pdf_path)
        else:
            test_problematic_pdf(args.pdf_path)
    else:
        # Default: check dependencies and show usage
        check_dependencies()
        print("\n" + "=" * 80)
        print("Usage:")
        print("  python test_pdf_fallback.py <pdf_path>           # Test full processing chain")
        print("  python test_pdf_fallback.py <pdf_path> --direct  # Test fallback processor only")
        print("  python test_pdf_fallback.py --check-deps         # Check dependencies")
        print("=" * 80)
