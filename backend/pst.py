"""
PST File Reader - Extract and print email details with attachments

Installation required:
    pip install pypff-python

Alternative if pypff doesn't work:
    pip install libratom
    or
    pip install extract-msg
"""

import pypff
import sys
from datetime import datetime

def format_size(size_bytes):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def process_folder(folder, folder_path="", email_count=[0]):
    """Recursively process folders and emails"""
    current_path = f"{folder_path}/{folder.name}" if folder_path else folder.name
    print(f"\n📁 FOLDER: {current_path}")
    print("-" * 80)
    
    # Process messages in this folder
    for message in folder.sub_messages:
        email_count[0] += 1
        print(f"\n📧 EMAIL #{email_count[0]}")
        print("-" * 80)
        
        # Extract email details
        try:
            subject = message.subject or "No Subject"
            sender = message.sender_name or "Unknown"
            sender_email = message.sender_email_address or ""
            recipients = message.get_recipients()
            date = message.delivery_time or message.client_submit_time
            
            print(f"From: {sender} <{sender_email}>")
            
            # Print recipients
            if recipients:
                print(f"To: ", end="")
                to_list = []
                for recipient in recipients:
                    rec_name = recipient.name or ""
                    rec_email = recipient.email_address or ""
                    to_list.append(f"{rec_name} <{rec_email}>")
                print(", ".join(to_list))
            
            print(f"Date: {date}")
            print(f"Subject: {subject}")
            
            # Get email body
            body = ""
            if message.plain_text_body:
                body = message.plain_text_body.decode('utf-8', errors='ignore')
            elif message.html_body:
                body = message.html_body.decode('utf-8', errors='ignore')
                print("(HTML body)")
            
            # Print body preview
            if body:
                preview = body.strip()[:200].replace('\n', ' ')
                print(f"\nBody Preview: {preview}...")
            else:
                print("\nBody Preview: (No body text)")
            
            # Process attachments
            num_attachments = message.number_of_attachments
            print(f"\nAttachments: {num_attachments}")
            
            if num_attachments > 0:
                for i in range(num_attachments):
                    attachment = message.get_attachment(i)
                    filename = attachment.name or f"attachment_{i}"
                    size = attachment.size
                    print(f"  📎 {filename} ({format_size(size)})")
            
            print("=" * 80)
            
        except Exception as e:
            print(f"Error processing email: {e}")
            print("=" * 80)
    
    # Process subfolders recursively
    for subfolder in folder.sub_folders:
        process_folder(subfolder, current_path, email_count)

def read_pst_file(pst_filename):
    """Read and print contents of PST file"""
    try:
        # Open PST file
        pst = pypff.file()
        pst.open(pst_filename)
        
        print(f"PST File: {pst_filename}")
        print(f"Total items: {pst.number_of_items}")
        print("=" * 80)
        
        # Get root folder
        root = pst.root_folder
        
        # Process all folders recursively
        email_count = [0]
        process_folder(root, "", email_count)
        
        print(f"\n\n✅ Total emails processed: {email_count[0]}")
        
        pst.close()
        
    except FileNotFoundError:
        print(f"❌ Error: PST file '{pst_filename}' not found")
    except Exception as e:
        print(f"❌ Error reading PST file: {e}")
        import traceback
        traceback.print_exc()

# Usage
if __name__ == "__main__":
    if len(sys.argv) > 1:
        pst_filename = sys.argv[1]
    else:
        pst_filename = "rp50.pst"  # Replace with your PST file name
    
    read_pst_file(pst_filename)