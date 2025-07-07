import csv
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('email_sender.log')
    ]
)
logger = logging.getLogger(__name__)

def preview_csv(file_path, num_rows=5):
    """Preview the first few rows of a CSV file"""
    try:
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            headers = next(reader, [])
            logger.info(f"Headers: {headers}")

            for i, row in enumerate(reader):
                if i >= num_rows:
                    break
                logger.info(f"Row {i+1}: {row}")
                
        return True
    except FileNotFoundError:
        logger.error(f"❌ File not found: {file_path}")
        return False
    except Exception as e:
        logger.error(f"❌ Error reading CSV: {e}")
        return False

def send_emails_from_csv(file_path, recipient_email, sender_email, password, smtp_server="smtp.ionos.fr", 
                         port=465, limit=100, delay=2, use_ssl=True):
    """
    Send emails from CSV data to a specific recipient
    
    Args:
        file_path: Path to the CSV file containing email data
        recipient_email: Email address to send all emails to
        sender_email: Email address to send from
        password: Password for sender email
        smtp_server: SMTP server address
        port: SMTP server port
        limit: Maximum number of emails to send
        delay: Delay between emails in seconds
    """
    try:
        # Check if file exists first
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return False
            
        # Preview the CSV first
        logger.info(f"Previewing CSV file: {file_path}")
        preview_csv(file_path, 2)
        
        # Create secure SSL context
        context = ssl.create_default_context()
        
        # Connect to server - use SSL or STARTTLS based on port/settings
        logger.info(f"Connecting to SMTP server: {smtp_server}:{port} (SSL: {use_ssl})")
        
        if use_ssl:
            # Direct SSL connection
            with smtplib.SMTP_SSL(smtp_server, port, context=context) as server:
                # Login to email account
                logger.info(f"Logging in as {sender_email}")
                server.login(sender_email, password)
                
                # Process and send emails
                send_emails(server, file_path, recipient_email, sender_email, limit, delay)
        else:
            # STARTTLS connection
            with smtplib.SMTP(smtp_server, port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                
                # Login to email account
                logger.info(f"Logging in as {sender_email}")
                server.login(sender_email, password)
                
                # Process and send emails
                send_emails(server, file_path, recipient_email, sender_email, limit, delay)
                
        return True
            
    except Exception as e:
        logger.error(f"Error sending emails: {e}")
        return False

def send_emails(server, file_path, recipient_email, sender_email, limit, delay):
    """Helper function to process CSV and send emails using an established server connection"""
    # Read CSV and send emails
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        headers = next(reader, [])
        
        # Determine column indices based on headers
        subject_idx = headers.index('subject') if 'subject' in headers else None
        body_idx = headers.index('message') if 'message' in headers else 1  # Default to second column
        sender_name_idx = headers.index('sender_name') if 'sender_name' in headers else None
        
        # If subject not found, try to extract from message
        has_subject_in_body = subject_idx is None
        
        # Send emails
        count = 0
        for row in reader:
            if count >= limit:
                break
                
            if len(row) <= body_idx:
                logger.warning(f"Row {count+1} has insufficient columns, skipping")
                continue
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            
            # Get body from CSV
            body = row[body_idx] if row[body_idx] else "No Body"
            
            # Extract subject from body if needed
            if has_subject_in_body:
                # Try to extract subject from email headers in body
                subject = "No Subject"
                for line in body.split('\n'):
                    if line.startswith("Subject:"):
                        subject = line.replace("Subject:", "").strip()
                        break
            else:
                # Get subject directly from subject column
                subject = row[subject_idx] if row[subject_idx] else "No Subject"
            
            # Add sender name if available
            if sender_name_idx is not None and len(row) > sender_name_idx:
                sender_name = row[sender_name_idx]
                if sender_name:
                    msg['From'] = f"{sender_name} <{sender_email}>"
            
            # Add original email info to body
            email_info = f"\n\n---\nOriginal Email #{count+1} from CSV\n"
            for i, header in enumerate(headers):
                if i < len(row):
                    email_info += f"{header}: {row[i][:100]}...\n" if len(row[i]) > 100 else f"{header}: {row[i]}\n"
            
            msg['Subject'] = subject
            msg.attach(MIMEText(body + email_info, 'plain'))
            
            # Send email
            try:
                server.send_message(msg)
                count += 1
                logger.info(f"Email #{count} sent: {subject[:30]}...")
                
                # Add delay between emails to avoid rate limiting
                if count < limit:
                    time.sleep(delay)
            except Exception as e:
                logger.error(f"Failed to send email #{count+1}: {e}")
    
    logger.info(f"Successfully sent {count} emails to {recipient_email}")

if __name__ == "__main__":
    # Email configuration - DO NOT hardcode credentials in production!
    # These are only used for testing and should be moved to environment variables
    # or a secure configuration file in a real application
    RECIPIENT_EMAIL = "edoardogenissel@gmail.com"
    # Corrected email address - make sure it matches exactly with your IONOS account
    SENDER_EMAIL = "info@chardouin.fr"  # Changed from passwotinfo to info
    PASSWORD = "enzo789luigiIO&"  # This should be stored securely, not in code
    CSV_FILE = "/Users/edoardo/Downloads/emails.csv"
    
    # IONOS Mail Server Settings
    SMTP_SERVER = "smtp.ionos.fr"
    SMTP_PORT = 465  # SSL port
    USE_SSL = True   # Use SSL instead of STARTTLS
    
    logger.info(f"Starting email sending process at {datetime.now()}")
    send_emails_from_csv(
        file_path=CSV_FILE,
        recipient_email=RECIPIENT_EMAIL,
        sender_email=SENDER_EMAIL,
        password=PASSWORD,
        smtp_server=SMTP_SERVER,
        port=SMTP_PORT,
        use_ssl=USE_SSL,
        limit=100,
        delay=2  # 2 second delay between emails to avoid rate limiting
    )
