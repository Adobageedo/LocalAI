#!/usr/bin/env python3
import asyncio
import sys
import os
import json
import re
from collections import defaultdict
from datetime import datetime

# Adjust path so we can import StyleAnalyzer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.services.style_analysis.style_analyzer import StyleAnalyzer

def load_emails(json_file: str, max_per_receiver: int = 5):
    """
    Load emails from JSON and limit to max_per_receiver per receiver.
    Concatenates 'response' and 'received' to form the 'body'.
    
    Args:
        json_file: Path to the JSON file with emails
        max_per_receiver: Maximum emails per receiver
    
    Returns:
        List of emails with 'subject' and 'body' fields
    """
    with open(json_file, "r", encoding="utf-8") as f:
        all_emails = json.load(f)

    emails_by_receiver = defaultdict(list)
    for email in all_emails:
        received_field = email.get("received", "")
        # Extract the first email inside <>
        match = re.search(r"<([^<>]+)>", received_field)
        sender_email = match.group(1) if match else "unknown"

        if len(emails_by_receiver[sender_email]) < max_per_receiver:
            body_parts = []
            response = email.get("response", "").strip()
            received = email.get("received", "").strip()
            if response:
                body_parts.append(response)
            if received:
                body_parts.append(received)
            body = "\n\n".join(body_parts)
            body=body.strip()[:1000]

            emails_by_receiver[sender_email].append({
                "subject": email.get("subject", ""),
                "body": body
            })

    # Flatten to a single list
    limited_emails = []
    for email_list in emails_by_receiver.values():
        limited_emails.extend(email_list)

    return limited_emails

async def analyze_emails(json_file: str):
    # Load and limit emails
    sample_emails = load_emails(json_file, max_per_receiver=5)
    print(f"Loaded {len(sample_emails)} emails for analysis.")

    # Initialize StyleAnalyzer with the real LLM
    analyzer = StyleAnalyzer(model="gpt-4.1-nano", temperature=0.7, max_tokens=5000)

    # Perform the analysis
    result = await analyzer.analyze_user_style(sample_emails)

    # Print the results
    print("=== Style Analysis Result ===")
    print(result['style_analysis'])
    print("\n=== Metadata ===")
    for key, value in result['analysis_metadata'].items():
        print(f"{key}: {value}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Analyze user email style from JSON")
    parser.add_argument(
        "json_file",
        nargs="?",
        default="/Users/edoardo/Documents/LocalAI/backend/sent_emails.json",
        help="Path to JSON file containing emails"
    )
    args = parser.parse_args()

    asyncio.run(analyze_emails(args.json_file))