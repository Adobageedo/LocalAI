"""
Download PDP API Router
Serves generated PDP documents
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import sys
import os

# Add the project root so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from src.services.mcp.mcp_document_generator import DocumentGeneratorService
from src.core.logger import log

logger = log.bind(name="api.router.llm.download_pdp")

router = APIRouter()

# Initialize service
doc_service = DocumentGeneratorService()


@router.get("/")
async def download_pdp(surname: Optional[str] = None):
    """
    Download the latest PDP document
    
    Query params:
        surname: Optional surname/windfarm identifier
    """
    try:
        # Get project root and PDP base folder
        project_root = Path(__file__).parent.parent.parent.parent.parent
        pdp_folder = project_root / "mcp" / "data" / "PDP"
        
        if not pdp_folder.exists():
            logger.error(f"PDP folder not found: {pdp_folder}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDP folder not found"
            )
        
        # If surname provided, look in that specific folder
        if surname:
            target_folder = pdp_folder / surname
            if not target_folder.exists():
                logger.error(f"Windfarm folder not found: {target_folder}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No PDPs found for windfarm: {surname}"
                )
        else:
            # Look in all subfolders for the most recent PDF
            target_folder = pdp_folder
        
        # Find all PDF files recursively
        pdf_files = list(target_folder.rglob("*.pdf"))
        
        if not pdf_files:
            logger.error(f"No PDF files found in {target_folder}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No PDP files found"
            )
        
        # Get the most recent PDF
        latest_pdf = max(pdf_files, key=lambda p: p.stat().st_mtime)
        
        logger.info(f"Serving PDF: {latest_pdf.name}")
        
        # Return the file
        return FileResponse(
            path=str(latest_pdf),
            media_type="application/pdf",
            filename=latest_pdf.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading PDP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download PDP"
        )
