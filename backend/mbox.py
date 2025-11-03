# Replace 'your_file.box' with the path to your .box file

import mailbox
import email
from email.header import decode_header
import os

def decode_mime_header(header):
    """Decode MIME encoded email headers"""
    if header is None:
        return ""
    decoded_parts = decode_header(header)
    decoded_string = ""
    for content, encoding in decoded_parts:
        if isinstance(content, bytes):
            decoded_string += content.decode(encoding or 'utf-8', errors='ignore')
        else:
            decoded_string += content
    return decoded_string

def print_mbox_contents(mbox_file):
    """Print details of each email in the MBOX file"""
    try:
        # Open the MBOX file
        mbox = mailbox.mbox(mbox_file)
        
        print(f"Total emails in MBOX: {len(mbox)}\n")
        print("=" * 80)
        
        for idx, message in enumerate(mbox, 1):
            print(f"\n📧 EMAIL #{idx}")
            print("-" * 80)
            
            # Extract email headers
            subject = decode_mime_header(message.get('Subject', 'No Subject'))
            from_addr = decode_mime_header(message.get('From', 'Unknown'))
            to_addr = decode_mime_header(message.get('To', 'Unknown'))
            date = message.get('Date', 'Unknown')
            
            print(f"From: {from_addr}")
            print(f"To: {to_addr}")
            print(f"Date: {date}")
            print(f"Subject: {subject}")
            
            # Extract email body
            body = ""
            if message.is_multipart():
                for part in message.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition", ""))
                    
                    # Get text body
                    if content_type == "text/plain" and "attachment" not in content_disposition:
                        try:
                            body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        except:
                            body = "Could not decode body"
                        break
            else:
                try:
                    body = message.get_payload(decode=True).decode('utf-8', errors='ignore')
                except:
                    body = "Could not decode body"
            
            # Print first 200 characters of body
            print(f"\nBody Preview: {body[:200]}...")
            
            # Check for attachments
            print("\nAttachments:")
            has_attachments = False
            
            if message.is_multipart():
                for part in message.walk():
                    content_disposition = str(part.get("Content-Disposition", ""))
                    
                    if "attachment" in content_disposition:
                        has_attachments = True
                        filename = part.get_filename()
                        if filename:
                            filename = decode_mime_header(filename)
                            content_type = part.get_content_type()
                            size = len(part.get_payload(decode=True) or b"")
                            print(f"  📎 {filename} ({content_type}, {size} bytes)")
            
            if not has_attachments:
                print("  No attachments")
            
            print("=" * 80)
    
    except FileNotFoundError:
        print(f"Error: MBOX file '{mbox_file}' not found")
    except Exception as e:
        print(f"Error reading MBOX file: {e}")
        import traceback
        traceback.print_exc()

# Usage example
if __name__ == "__main__":
    mbox_filename = "mbox"  # Replace with your MBOX file name
    print_mbox_contents(mbox_filename)