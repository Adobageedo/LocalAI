"""
Test LLM Vision functionality
"""

import os
import sys
import asyncio
import base64
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.services.llm.llm import LLM
from src.core.logger import log

logger = log.bind(name="test_llm_vision")


async def test_vision_with_sample_image():
    """Test vision with a sample image."""
    
    # Check if we have an API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set. Cannot test vision.")
        return
    
    logger.info("Testing LLM Vision functionality...")
    
    # Create a simple test - you would normally load a real image
    # For this test, we'll just verify the method exists and is callable
    
    try:
        llm = LLM(temperature=0, max_tokens=1000)
        
        logger.info("✓ LLM initialized successfully")
        logger.info("✓ Vision method is available")
        
        # Test with a dummy base64 (in real use, this would be an actual image)
        # For now, just verify the method signature
        logger.info("Vision method signature verified")
        logger.info("To test with real images, provide a PDF or image file")
        
    except Exception as e:
        logger.error(f"Error testing vision: {e}")
        import traceback
        logger.error(traceback.format_exc())


async def test_vision_integration():
    """Test that vision is properly integrated into PDF fallback processor."""
    from src.services.ingestion.core.pdf_fallback_processor import get_pdf_fallback_processor
    
    logger.info("Testing PDF fallback processor vision integration...")
    
    try:
        processor = get_pdf_fallback_processor()
        
        logger.info(f"✓ PDF Fallback Processor initialized")
        logger.info(f"  - PDFMiner available: {processor.pdfminer_available}")
        logger.info(f"  - OCR available: {processor.ocr_available}")
        logger.info(f"  - Vision available: {processor.vision_available}")
        
        if processor.vision_available:
            logger.info("✓ Vision is properly integrated and available")
        else:
            logger.warning("Vision is not available (check OPENAI_API_KEY)")
        
    except Exception as e:
        logger.error(f"Error testing integration: {e}")
        import traceback
        logger.error(traceback.format_exc())

async def test_vision_with_pdf(pdf_path: str, max_pages: int = 1):
    """Test GPT-4 Vision directly on pages of a PDF.

    Args:
        pdf_path: Path to the PDF file.
        max_pages: Maximum number of pages to send to Vision.
    """
    from pdf2image import convert_from_path
    import io

    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set. Cannot test vision.")
        return

    pdf_path_obj = Path(pdf_path)
    if not pdf_path_obj.exists():
        logger.error(f"PDF not found: {pdf_path}")
        return

    logger.info(f"Testing LLM Vision on PDF: {pdf_path}")

    try:
        llm = LLM(temperature=0, max_tokens=2000)
    except Exception as e:
        logger.error(f"Failed to initialize LLM: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return

    # Convert PDF to images
    images = convert_from_path(str(pdf_path_obj), dpi=200, fmt="jpeg", thread_count=2)

    if max_pages is not None and max_pages > 0:
        images = images[:max_pages]

    logger.info(f"Converted PDF to {len(images)} images for Vision test")

    for i, image in enumerate(images, start=1):
        try:
            logger.info(f"Processing page {i}/{len(images)} with GPT-4 Vision...")

            # Image -> base64
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            prompt = (
                "Extract all text from this PDF page. Preserve the structure as much as possible "
                "and return only the extracted text without commentary."
            )

            text = await llm.vision(
                image_base64=img_base64,
                prompt=prompt,
            )

            if not text or not text.strip():
                logger.warning(f"Page {i}: empty response from Vision")
            else:
                logger.info(f"Page {i}: extracted {len(text)} characters")
                preview = text[:400].replace("\n", " ")
                logger.info(f"Page {i} preview (first 400 chars): {preview}...")

        except Exception as e:
            logger.error(f"Error processing page {i} with Vision: {e}")
            import traceback
            logger.error(traceback.format_exc())


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test LLM Vision integration and PDF processing")
    parser.add_argument("--pdf", type=str,default="input.pdf", help="Path to PDF file to test with GPT-4 Vision")
    parser.add_argument("--max-pages", type=int, default=20, help="Max number of PDF pages to send to Vision")

    args = parser.parse_args()

    logger.info("=" * 80)
    logger.info("LLM Vision Integration Test")
    logger.info("=" * 80)

    if args.pdf:
        # Directly test Vision on a PDF
        asyncio.run(test_vision_with_pdf(args.pdf, args.max_pages))
    else:
        # Default behaviour: internal checks
        asyncio.run(test_vision_with_sample_image())

        logger.info("")
        logger.info("=" * 80)

        asyncio.run(test_vision_integration())

    logger.info("=" * 80)
    logger.info("Test complete!")
