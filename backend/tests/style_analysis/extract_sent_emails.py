#!/usr/bin/env python3
"""
Extract the 10 most recent sent emails from an MBOX file,
separating received email and your response, and save as JSON.
"""

import os
import sys
import re
import mailbox
import logging
import json
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime
from typing import List, Dict, Any
from bs4 import BeautifulSoup

# Add project root to path for clean_text
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.utils.clean_text import clean_body_text

# Logging setup
logger = logging.getLogger("extract_sent_emails")
logger.setLevel(logging.DEBUG)
console = logging.StreamHandler()
console.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
logger.addHandler(console)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
def decode_mime_header(header: str) -> str:
    if not header:
        return ""
    decoded_parts = decode_header(header)
    decoded_string = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            decoded_string += part.decode(encoding or 'utf-8', errors="ignore")
        else:
            decoded_string += part
    return decoded_string.strip()


def extract_body_from_message(message) -> str:
    """Extract plain text or HTML converted to text."""
    body_text = ""
    body_html = ""

    if message.is_multipart():
        for part in message.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", "")).lower()
            if "attachment" in content_disposition:
                continue
            try:
                payload = part.get_payload(decode=True)
                if not payload:
                    continue
                decoded = payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
            except Exception as e:
                logger.warning(f"Failed to decode part: {e}")
                continue
            if content_type == "text/plain":
                body_text += decoded + "\n"
            elif content_type == "text/html" and not body_text:
                body_html += decoded
    else:
        try:
            payload = message.get_payload(decode=True)
            if payload:
                body_text = payload.decode(message.get_content_charset() or "utf-8", errors="ignore")
        except Exception as e:
            logger.warning(f"Failed to decode non-multipart payload: {e}")

    if not body_text and body_html:
        soup = BeautifulSoup(body_html, "html.parser")
        for tag in soup(["script", "style", "blockquote"]):
            tag.decompose()
        body_text = soup.get_text(separator="\n", strip=True)

    return body_text.strip()


def split_response_and_received(body_text: str) -> Dict[str, str]:
    """
    Split an email body into the user's response and the original received email.
    """
    # Common reply markers
    markers = [
        r"(?i)^de\s*:.*$",              # French "De :"
        r"(?i)^from\s*:.*$",            # English "From:"
        r"(?i)^on\s.*wrote\s*:.*$",     # "On ... wrote:"
        r"(?i)^le\s.*écrit\s*:.*$",     # "Le ... a écrit :"
        r"(?i)^-----.*message.*-----$", # "-----Original Message-----"
        r"(?i)^>+",                     # quoted lines
    ]

    lines = body_text.splitlines()
    response_lines = []
    received_lines = []
    found_marker = False

    for line in lines:
        if not found_marker and any(re.match(p, line.strip()) for p in markers):
            found_marker = True
        if found_marker:
            received_lines.append(line)
        else:
            response_lines.append(line)

    response = "\n".join(response_lines).strip()
    received = "\n".join(received_lines).strip()
    return {"response": response, "received": received}


def extract_email_data(message) -> Dict[str, Any]:
    sender = decode_mime_header(message.get('From', ''))
    receiver = decode_mime_header(message.get('To', ''))
    subject = decode_mime_header(message.get('Subject', ''))
    date_str = message.get('Date', '')

    body_text = extract_body_from_message(message)
    body_text = clean_body_text(body_text, delete_quotes=False)
    split = split_response_and_received(body_text)

    try:
        date = parsedate_to_datetime(date_str)
    except Exception:
        logger.warning(f"Failed to parse date: {date_str}")
        date = datetime.min

    return {
        "sender": sender,
        "receiver": receiver,
        "subject": subject,
        "date": date.isoformat(),
        "response": split["response"],
        "received": split["received"]
    }


def extract_sent_emails(mbox_file: str, limit: int = 10) -> List[Dict[str, Any]]:
    if not os.path.exists(mbox_file):
        logger.error(f"MBOX file not found: {mbox_file}")
        return []

    logger.info(f"Opening MBOX: {mbox_file}")
    mbox = mailbox.mbox(mbox_file)
    emails = []

    for message in mbox:
        email_data = extract_email_data(message)
        if len(email_data["response"]) < 10:
            continue
        emails.append(email_data)
        # if len(emails) >= limit:
        #     break

    emails.sort(key=lambda x: x["date"], reverse=True)
    return emails


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    mbox_path = os.path.expanduser(
        "~/Documents/mbox_output/Fichier de données Outlook/Éléments envoyés/mbox"
    )
    output_json = os.path.expanduser("~/Documents/LocalAI/backend/sent_emails.json")

    sent_emails = extract_sent_emails(mbox_path, limit=10000)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(sent_emails, f, ensure_ascii=False, indent=2)

    logger.info(f"✅ Saved {len(sent_emails)} emails to {output_json}")