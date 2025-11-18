"""
MCP Document Generator Service
Ports the Node.js document generation functionality to Python
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
import subprocess
import logging

logger = logging.getLogger(__name__)


class DocumentGeneratorService:
    """Service for generating PDP documents"""
    
    def __init__(self, base_folder: str = None):
        if base_folder is None:
            # Default to mcp/data/PDP
            project_root = Path(__file__).parent.parent.parent.parent
            base_folder = project_root / "mcp" / "data" / "PDP"
        self.base_folder = Path(base_folder)
        self.base_folder.mkdir(parents=True, exist_ok=True)
        
    async def generate_pdp(
        self,
        pdp_id: str,
        windfarm_name: str,
        data: Dict[str, Any],
        surname: Optional[str] = None,
        template_name: Optional[str] = None,
        merge_with_pdp: bool = True,
        save_to_file: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a PDP document
        
        Args:
            pdp_id: Unique identifier for the PDP
            windfarm_name: Name of the windfarm
            data: Document data (company, workers, etc.)
            surname: Surname for file naming
            template_name: Template file name
            merge_with_pdp: Whether to merge with annual PDF
            save_to_file: Whether to save to file
            
        Returns:
            Dict with success status, file path, and metadata
        """
        try:
            logger.info(f"Generating PDP document: {pdp_id} for {windfarm_name}")
            
            # For now, we'll bridge to the Node.js implementation
            # In the future, this can be fully ported to Python
            result = await self._call_node_mcp_tool(
                "generate_pdp_document",
                {
                    "pdpId": pdp_id,
                    "windfarmName": windfarm_name,
                    "data": data,
                    "surname": surname,
                    "templateName": template_name,
                    "mergeWithPDP": merge_with_pdp,
                    "saveToFile": save_to_file
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating PDP: {str(e)}")
            raise
    
    async def _call_node_mcp_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Bridge to Node.js MCP tool (temporary solution)
        
        Args:
            tool_name: Name of the MCP tool
            args: Tool arguments
            
        Returns:
            Tool execution result
        """
        try:
            # Get MCP directory
            project_root = Path(__file__).parent.parent.parent.parent
            mcp_dir = project_root / "mcp"
            
            # Prepare the MCP tool call via Node.js
            # This assumes the MCP server can be called directly
            cmd = [
                "node",
                str(mcp_dir / "src" / "cli.js"),  # We'll create this CLI wrapper
                tool_name,
                json.dumps(args)
            ]
            
            # Execute the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                cwd=str(mcp_dir)
            )
            
            # Parse the result
            output = json.loads(result.stdout)
            return output
            
        except subprocess.CalledProcessError as e:
            logger.error(f"MCP tool execution failed: {e.stderr}")
            raise Exception(f"MCP tool '{tool_name}' failed: {e.stderr}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse MCP tool output: {str(e)}")
            raise Exception(f"Invalid output from MCP tool '{tool_name}'")
        except Exception as e:
            logger.error(f"Unexpected error calling MCP tool: {str(e)}")
            raise
            
    def get_latest_pdf_path(self, surname: str) -> Optional[Path]:
        """
        Get the latest PDP PDF file for a given surname
        
        Args:
            surname: The surname/windfarm identifier
            
        Returns:
            Path to the latest PDF or None if not found
        """
        try:
            # Look in the windfarm-specific folder
            windfarm_folder = self.base_folder / surname
            if not windfarm_folder.exists():
                return None
            
            # Find all PDF files
            pdf_files = list(windfarm_folder.glob("*.pdf"))
            if not pdf_files:
                return None
            
            # Return the most recent one
            latest_pdf = max(pdf_files, key=lambda p: p.stat().st_mtime)
            return latest_pdf
            
        except Exception as e:
            logger.error(f"Error finding latest PDF: {str(e)}")
            return None
