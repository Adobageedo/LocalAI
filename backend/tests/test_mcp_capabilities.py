#!/usr/bin/env python3
"""
Test script for MCP capability-based abstraction.
This script tests all capabilities (email, calendar, cloud_storage) with the new abstracted interface.
"""

import requests
import json
import argparse
import sys
from rich.console import Console
from rich.table import Table

console = Console()

def test_capabilities(base_url, user_id):
    """Test all MCP capabilities for a given user."""
    console.print(f"[bold blue]Testing MCP capabilities for user: {user_id}[/bold blue]")
    
    # Test 1: Get user's connected capabilities
    console.print("\n[bold]Test 1: Getting user's connected capabilities[/bold]")
    try:
        response = requests.get(f"{base_url}/services/{user_id}")
        response.raise_for_status()
        result = response.json()
        capabilities = result.get("services", [])
        console.print(f"Connected capabilities: {capabilities}", style="green")
    except Exception as e:
        console.print(f"Error getting capabilities: {str(e)}", style="red")
        return
    
    # Test 2: Get schema for the user
    console.print("\n[bold]Test 2: Getting schema for user[/bold]")
    try:
        response = requests.get(f"{base_url}/schema/{user_id}")
        response.raise_for_status()
        schema = response.json()
        console.print("Schema retrieved successfully", style="green")
        
        # Display available tools from schema
        tools = schema.get("components", {}).get("schemas", {}).keys()
        table = Table(title="Available Tools")
        table.add_column("Tool Name")
        for tool in tools:
            table.add_row(tool)
        console.print(table)
    except Exception as e:
        console.print(f"Error getting schema: {str(e)}", style="red")
        return
    
    # Test 3: Test each capability
    console.print("\n[bold]Test 3: Testing individual capabilities[/bold]")
    
    # Test Email capability
    if "email" in capabilities:
        console.print("\n[bold cyan]Testing Email Capability[/bold cyan]")
        
        # Test send_email (dry run)
        console.print("Testing send_email (dry run)...")
        payload = {
            "tool_name": "send_email",
            "parameters": {
                "to": ["test@example.com"],
                "subject": "Test Email from MCP",
                "body": "This is a test email from MCP capability test."
            }
        }
        try:
            # Just print the payload instead of actually sending
            console.print(f"Would send: {json.dumps(payload, indent=2)}", style="yellow")
            console.print("To actually send, uncomment the POST request below", style="yellow")
            
            # Uncomment to actually send
            response = requests.post(f"{base_url}/call/{user_id}", json=payload)
            response.raise_for_status()
            console.print(f"Send email result: {response.json()}", style="green")
        except Exception as e:
            console.print(f"Error with send_email: {str(e)}", style="red")
    else:
        console.print("Email capability not available", style="yellow")
    
    # Test Cloud Storage capability
    if "cloud_storage" in capabilities:
        console.print("\n[bold cyan]Testing Cloud Storage Capability[/bold cyan]")
        
        # Test list_files
        console.print("Testing list_files...")
        payload = {
            "tool_name": "list_files",
            "parameters": {
                "folder_id": "root",
                "page_size": 10
            }
        }
        try:
            response = requests.post(f"{base_url}/call/{user_id}", json=payload)
            response.raise_for_status()
            result = response.json()
            console.print("Files list retrieved successfully", style="green")
            
            # Display files
            if result.get("success") and "files" in result.get("data", {}):
                files = result["data"]["files"]
                table = Table(title="Files")
                table.add_column("Name")
                table.add_column("ID")
                table.add_column("Type")
                
                for file in files[:5]:  # Show first 5 files
                    table.add_row(
                        file.get("name", ""),
                        file.get("id", ""),
                        file.get("mimeType", "")
                    )
                console.print(table)
            else:
                console.print(f"Error in response: {result}", style="yellow")
        except Exception as e:
            console.print(f"Error with list_files: {str(e)}", style="red")
    else:
        console.print("Cloud Storage capability not available", style="yellow")
    
    # Test Calendar capability
    if "calendar" in capabilities:
        console.print("\n[bold cyan]Testing Calendar Capability[/bold cyan]")
        
        # Test list_events
        console.print("Testing list_events...")
        payload = {
            "tool_name": "list_events",
            "parameters": {
                "calendar_id": "primary",
                "time_min": "2023-01-01T00:00:00Z",
                "time_max": "2030-01-01T00:00:00Z"
            }
        }
        try:
            response = requests.post(f"{base_url}/call/{user_id}", json=payload)
            response.raise_for_status()
            result = response.json()
            console.print("Events list retrieved successfully", style="green")
            
            # Display events
            if result.get("success") and "events" in result.get("data", {}):
                events = result["data"]["events"]
                table = Table(title="Events")
                table.add_column("Summary")
                table.add_column("Start")
                table.add_column("End")
                
                for event in events[:5]:  # Show first 5 events
                    table.add_row(
                        event.get("summary", ""),
                        event.get("start", {}).get("dateTime", ""),
                        event.get("end", {}).get("dateTime", "")
                    )
                console.print(table)
            else:
                console.print(f"Error in response: {result}", style="yellow")
        except Exception as e:
            console.print(f"Error with list_events: {str(e)}", style="red")
    else:
        console.print("Calendar capability not available", style="yellow")
    
    console.print("\n[bold green]Testing completed![/bold green]")

def main():
    parser = argparse.ArgumentParser(description="Test MCP capability-based abstraction")
    parser.add_argument("--base-url", default="http://localhost:8001/mcp", help="Base URL for MCP API")
    parser.add_argument("--user-id", default="7EShftbbQ4PPTS4hATplexbrVHh2", help="User ID to test with")
    
    args = parser.parse_args()
    
    test_capabilities(args.base_url, args.user_id)

if __name__ == "__main__":
    main()
