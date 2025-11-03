#!/usr/bin/env python3
"""
Script d'ingestion d'emails MBOX dans Qdrant avec intégration du registre JSON.
"""

import os
import sys
import hashlib
import argparse
import datetime
import tempfile
import json
import time
import mailbox
from email.header import decode_header
from typing import List, Dict, Any, Optional, Tuple
import re
import base64
import quopri
from bs4 import BeautifulSoup

# Ajouter le chemin racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..',)))

# Importer les modules nécessaires
from src.services.ingestion.services.ingest_google_emails import parse_email_date
from src.services.ingestion.core.ingest_core import flush_batch
from src.services.storage.file_registry import FileRegistry
from src.core.logger import log
from src.services.ingestion.core.model import Email, EmailAttachment, EmailContent, EmailMetadata
from src.services.ingestion.core.utils import generate_email_id
from src.services.db.email_manager import EmailManager




import os
import sys
from typing import List
from openpyxl import Workbook

def save_emails_to_xlsx(emails: List[Email], folder_path: str = "/Users/edoardo/Documents/LocalAI/backend/data", filename: str = "emails_debug.xlsx"):
    """
    Sauvegarde les emails dans un fichier Excel (.xlsx) dans le dossier spécifié.
    
    Args:
        emails: Liste d'objets Email
        filename: Nom du fichier Excel (par défaut 'emails_debug.xlsx')
    """
    os.makedirs(folder_path, exist_ok=True)
    
    xlsx_file = os.path.join(folder_path, filename)
    fieldnames = ["subject", "sender", "date", "body_text", "body_html"]

    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Emails"

        # Write header
        ws.append(fieldnames)

        # Write email data
        for email in emails:
            ws.append([
                re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', getattr(email.metadata, "subject", "")),
                re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', getattr(email.metadata, "sender", "")),
                re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', getattr(email.metadata, "date", "")),
                re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', getattr(email.content, "body_text", "")),
                re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', getattr(email.content, "body_html", ""))
            ])

        # Auto-adjust column widths (optional)
        for col in ws.columns:
            max_length = 0
            col_letter = col[0].column_letter
            for cell in col:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            ws.column_dimensions[col_letter].width = max_length + 5

        wb.save(xlsx_file)
        logger.info(f"{len(emails)} emails saved to {xlsx_file}")

    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde Excel: {e}")

    sys.exit(0)


sender_avoid_list = [
    "Lucca <no-reply@ilucca.net>",
    "Microsoft Power BI <no-reply-powerbi@microsoft.com>",
    "Microsoft Teams <no-reply@microsoft.com>",
    "<no-reply@app-notifs.gymlib.com>",
    "HR Team informs you <hello@supermood.co>",
    "noreply@eu.ecoonline.net",
    "noreply@notilus-tne.cegid.cloud",
    "lucie@fairjungle.com",
    "WeTransfer <noreply@wetransfer.com>",
    "Les ressources humaines <hr@akuoenergy.com>"
]

# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="src.services.ingestion.services.ingest_mbox")

def clean_body_text(text: str) -> str:
    """Clean and normalize extracted email text."""
    if not text:
        return ""

    # 1️⃣ Decode base64 or quoted-printable fragments
    if re.fullmatch(r"[A-Za-z0-9+/=\s]+", text.strip()):
        try:
            decoded = base64.b64decode(text)
            text = decoded.decode("utf-8", errors="replace")
        except Exception:
            pass
    if "=" in text and re.search(r"=[A-F0-9]{2}", text):
        try:
            text = quopri.decodestring(text).decode("utf-8", errors="replace")
        except Exception:
            pass

    # 2️⃣ Remove Outlook / Exchange banners and warnings
    external_banner_patterns = [
        r"\*\*\*.*EXTERNAL.*\*\*\*",
        r"\[EXTERNAL\].*",
        r"\[EXT\].*",
        r"(?i)this message comes from an external.*",
        r"(?i)exercise caution.*unknown senders.*",
        r"(?i)vous n.obtenez pas souvent d.?e.?mail.*",
        r"(?i)pourquoi c.?est important.*",
        r"(?i)you don.?t often get email from.*",
        r"(?i)learn why this is important.*",
    ]
    for pat in external_banner_patterns:
        text = re.sub(pat, "", text, flags=re.IGNORECASE)

    # 3️⃣ Remove quarantine or spam review messages (Microsoft Security Center)
    quarantine_patterns = [
        r"(?is)examiner ces messages.*?déclaration de confidentialité.*règles de bon usage",
        r"(?is)review these messages.*?privacy statement.*acceptable use policy",
        r"(?is)quarantine notification.*?(microsoft corporation|privacy statement).*",
        r"(?is)courriers indésirables bloqués.*?déclaration de confidentialité.*",
    ]
    for pat in quarantine_patterns:
        text = re.sub(pat, "", text)

    # 4️⃣ Remove Microsoft Teams / Outlook / meeting invitation blocks (includes "réunion" + "subject")
    meeting_patterns = [
        r"(?is)_{5,}.*microsoft teams.*?_{5,}",          # Teams footer
        r"(?is)microsoft teams.*?(rejoignez|join|meeting id|id de réunion).*",
        r"(?is)besoin d.?aide\s*\?.*options de réunion.*",
        r"(?is)trouver un num.ro local.*",
        r"(?is)id de la conférence.*",
        r"(?is)options de réunion.*",
        r"(?is)(réunion|meeting).{0,200}(id|code secret|join|rejoindre|subject|objet).*",  # any text block mentioning meeting
        r"(?is)^subject\s*:.*$",                         # English "Subject:"
        r"(?is)^objet\s*:.*$",                           # French "Objet :"
    ]
    for pat in meeting_patterns:
        text = re.sub(pat, "", text)

    # 5️⃣ Normalize whitespace
    text = re.sub(r"\r", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = text.strip()

    # 6️⃣ Remove quoted replies / history headers
    reply_patterns = [
        r"(?i)^de\s*:.*$",
        r"(?i)^from\s*:.*$",
        r"(?i)^on.*wrote:$",
        r"(?i)^le\s.*\sécrit\s*:$",
    ]
    for pat in reply_patterns:
        match = re.search(pat, text, flags=re.MULTILINE)
        if match:
            text = text[:match.start()]
            break

    # 7️⃣ Remove common signatures (heuristic)
    sig_split = re.split(r"(Cordialement|Bien\s+cordialement|Best regards|Merci,)", text)
    if len(sig_split) > 1:
        text = sig_split[0].strip()
    
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', text)

    return text.strip()


def html_to_text(html: str) -> str:
    """Convert HTML to clean text."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "blockquote"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return clean_body_text(text)


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


def parse_mbox_message(message, message_id: str, user: str) -> Optional[Email]:
    """
    Parse un message MBOX en un objet Email.
    
    Args:
        message: Message MBOX à parser
        message_id: ID unique du message
        user: Adresse email de l'utilisateur
        
    Returns:
        Objet Email ou None en cas d'erreur
    """
    try:
        # Générer un doc_id temporaire à partir de l'ID du message
        temp_doc_id = hashlib.md5(message_id.encode('utf-8')).hexdigest()
        
        # Extraire les en-têtes
        subject = decode_mime_header(message.get('Subject', 'Sans sujet'))
        from_addr = decode_mime_header(message.get('From', 'Unknown'))
        to_addr = decode_mime_header(message.get('To', ''))
        cc_addr = decode_mime_header(message.get('Cc', ''))
        bcc_addr = decode_mime_header(message.get('Bcc', ''))
        date = message.get('Date', '')
        
        # Extraire le Message-ID pour la conversation
        internet_message_id = message.get('Message-ID', message_id)
        conversation_id = hashlib.md5(internet_message_id.encode('utf-8')).hexdigest()
        
        # Extraire le corps de l'email
        body_text = ""
        body_html = ""
        attachments = []
        
        if message.is_multipart():
            for part in message.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                # Extraire le texte brut
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        body_text = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except Exception as e:
                        logger.warning(f"Erreur lors du décodage du corps texte: {e}")
                        body_text = "Could not decode body"
                
                # Extraire le HTML
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    try:
                        body_html = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        # Si pas de body_text, extraire le texte du HTML
                        if not body_text:
                            from bs4 import BeautifulSoup
                            try:
                                soup = BeautifulSoup(body_html, 'html.parser')
                                body_text = soup.get_text()
                            except:
                                body_text = "Contenu HTML non analysable"
                    except Exception as e:
                        logger.warning(f"Erreur lors du décodage du corps HTML: {e}")
                
                # Extraire les pièces jointes
                elif "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        filename = decode_mime_header(filename)
                        try:
                            content = part.get_payload(decode=True)
                            if content:
                                attachments.append(EmailAttachment(
                                    filename=filename,
                                    content=content,
                                    content_type=content_type
                                ))
                        except Exception as e:
                            logger.warning(f"Erreur lors de l'extraction de la pièce jointe {filename}: {e}")
        else:
            # Email non-multipart
            try:
                payload = message.get_payload(decode=True)
                if payload:
                    body_text = payload.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.warning(f"Erreur lors du décodage du payload: {e}")
                body_text = "Could not decode body"

        #clean body text here
        body_text = clean_body_text(body_text)
        body_html_test = html_to_text(body_html)
        if len(body_text)<100:
            # logger.debug(f"Body text too short: {body_text}")
            return None
        if from_addr is None or from_addr in sender_avoid_list:
            # logger.debug(f"Sender is None or in avoid list: {from_addr}")
            return None
        # Créer les métadonnées
        metadata = EmailMetadata(
            doc_id=temp_doc_id,
            user=user,
            message_id=internet_message_id,
            provider_id=message_id,
            subject=subject,
            sender=from_addr,
            receiver=to_addr,
            cc=cc_addr,
            bcc=bcc_addr,
            date=date,
            source="mbox",
            conversation_id=conversation_id,
            has_attachments=len(attachments) > 0,
            folders="mbox"
        )
        
        # Créer l'objet de contenu de l'email
        content = EmailContent(
            body_text=body_text,
            body_html=body_html,
            attachments=attachments
        )
        
        # Créer et retourner l'objet Email complet
        return Email(metadata=metadata, content=content)
    
    except Exception as e:
        logger.error(f"Erreur lors du parsing du message {message_id}: {e}")
        import traceback
        traceback.print_exc()
        return None

def read_mbox_file(mbox_file: str, limit: int = None) -> List[Email]:
    """
    Lit un fichier MBOX et retourne une liste d'objets Email.
    
    Args:
        mbox_file: Chemin vers le fichier MBOX
        limit: Nombre maximum d'emails à lire
        
    Returns:
        Liste d'objets Email
    """
    emails = []
    
    try:
        # Ouvrir le fichier MBOX
        mbox = mailbox.mbox(mbox_file)
        logger.info(f"Fichier MBOX ouvert: {mbox_file}, {len(mbox)} emails trouvés")
        
        # Lire chaque message
        for idx, message in enumerate(mbox):
            if limit and idx >= limit:
                logger.info(f"Limite atteinte: {limit} emails")
                break
            
            # Générer un ID unique pour ce message
            message_id = f"mbox_{os.path.basename(mbox_file)}_{idx}"
            
            # Parser le message
            email = parse_mbox_message(message, message_id, "mbox_user")
            if email and email is not None:
                emails.append(email)
            
            # Log progress every 10 emails
            if (idx + 1) % 100 == 0:
                logger.info(f"Lecture en cours: {idx + 1}/{len(mbox)} emails traités")
        
        logger.info(f"Lecture terminée: {len(emails)} emails parsés")
        return emails
    
    except FileNotFoundError:
        logger.error(f"Fichier MBOX non trouvé: {mbox_file}")
        return []
    except Exception as e:
        logger.error(f"Erreur lors de la lecture du fichier MBOX: {e}")
        import traceback
        traceback.print_exc()
        return []


def save_mbox_attachments(email: Email, output_dir: str) -> List[str]:
    """
    Sauvegarde les pièces jointes d'un email dans un répertoire et renvoie leurs chemins.
    
    Args:
        email: L'email contenant les pièces jointes
        output_dir: Le répertoire de sortie
        
    Returns:
        Liste des chemins des pièces jointes sauvegardées
    """
    attachment_paths = []
    
    if not email.content.attachments:
        return attachment_paths
    
    # Créer le répertoire de sortie s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)
    
    # Sauvegarder chaque pièce jointe
    for idx, attachment in enumerate(email.content.attachments):
        # Nettoyer le nom de fichier
        safe_filename = "".join([c for c in attachment.filename if c.isalnum() or c in "._- "]).strip()
        
        if not safe_filename:
            safe_filename = f"attachment_{idx}"
        
        # Ajouter l'extension si elle n'est pas présente
        if '.' not in safe_filename and hasattr(attachment, 'content_type'):
            ext_map = {
                'application/pdf': '.pdf',
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'text/plain': '.txt',
                'text/html': '.html',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-powerpoint': '.ppt',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'application/zip': '.zip',
                'application/rtf': '.rtf'
            }
            safe_filename += ext_map.get(attachment.content_type, '.bin')
        
        # Chemin complet du fichier
        file_path = os.path.join(output_dir, safe_filename)
        
        # Éviter les collisions de noms
        counter = 1
        base_name, ext = os.path.splitext(file_path)
        while os.path.exists(file_path):
            file_path = f"{base_name}_{counter}{ext}"
            counter += 1
        
        # Sauvegarder la pièce jointe
        try:
            with open(file_path, 'wb') as f:
                f.write(attachment.content)
            attachment_paths.append(file_path)
            logger.debug(f"Pièce jointe sauvegardée: {safe_filename}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de la pièce jointe {safe_filename}: {e}")
    
    return attachment_paths


def ingest_mbox_to_qdrant(
    mbox_file: str,
    limit: int = 50,
    force_reingest: bool = False,
    save_attachments: bool = True,
    user_id: str = "default",
    min_date: Optional[datetime.datetime] = None,
    batch_size: int = 10,
    return_count: bool = False,
) -> Dict[str, Any]:
    """
    Ingère des emails d'un fichier MBOX dans Qdrant.
    
    Args:
        mbox_file: Chemin vers le fichier MBOX
        limit: Nombre maximum d'emails à ingérer
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder les pièces jointes
        user_id: Identifiant de l'utilisateur
        min_date: Date minimale pour filtrer les emails
        batch_size: Taille des lots pour le traitement
        return_count: Si True, retourne le nombre d'emails traités
        
    Returns:
        Dictionnaire avec les résultats de l'ingestion
    """
    start_time = time.time()
    
    # Résultat par défaut
    result = {
        "success": False,
        "total_emails_found": 0,
        "items_ingested": 0,
        "ingested_attachments": 0,
        "skipped_emails": 0,
        "errors": [],
        "duration": 0,
        "batches": 0
    }
    
    # Initialize FileRegistry for this user
    file_registry = FileRegistry(user_id)
    logger.info(f"File registry loaded for user {user_id}: {len(file_registry.registry)} entries")
    
    # email_manager = EmailManager()
    
    # Initialize batch for documents
    batch_documents = []
    
    try:
        # Vérifier que le fichier MBOX existe
        if not os.path.exists(mbox_file):
            raise FileNotFoundError(f"Fichier MBOX non trouvé: {mbox_file}")
        
        logger.info(f"Début de l'ingestion du fichier MBOX: {mbox_file}")
        
        # Lire les emails du fichier MBOX
        emails = read_mbox_file(mbox_file, limit)
        
        result["total_emails_found"] = len(emails)
        logger.info(f"Nombre d'emails trouvés: {len(emails)}")
        
        # Si aucun email trouvé, terminer
        if not emails:
            logger.info("Aucun email trouvé dans le fichier MBOX")
            result["success"] = True
            return result
        
        # Créer un répertoire temporaire pour les pièces jointes
        temp_dir = None
        if save_attachments:
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Répertoire temporaire pour les pièces jointes: {temp_dir}")
        # Parcourir chaque email pour la préparation des batch
        for email_idx, email in enumerate(emails):
            try:
                # Filtrer par date si spécifié
                if min_date:
                    try:
                        email_date = parse_email_date(email.metadata.date)
                        if email_date and email_date < min_date:
                            logger.debug(f"Email ignoré (trop ancien): {email.metadata.subject}")
                            result["skipped_emails"] += 1
                            continue
                    except Exception as e:
                        logger.warning(f"Impossible de parser la date de l'email: {e}")
                
                # Générer un ID unique pour l'email
                email_id = generate_email_id(email)
                email.metadata.doc_id = email_id
                
                # Vérifier si l'email existe déjà dans le registre
                source_path = f"/mbox/{user_id}/{email.metadata.conversation_id}/{email_id}"
                
                # Créer un fichier temporaire avec le contenu de l'email
                with tempfile.NamedTemporaryFile(mode='w+', suffix='.eml', delete=False) as temp_file:
                    # Écrire le contenu de l'email dans le fichier temporaire
                    temp_file.write(email.content.body_text or email.content.body_html or "")
                    filepath = temp_file.name
                
                # Préparer les métadonnées
                metadata = {
                    "doc_id": email_id,
                    "path": source_path,
                    "user": user_id,
                    "filename": f"{email.metadata.subject or 'No subject'}.eml",
                    "sender": email.metadata.sender,
                    "receiver": email.metadata.receiver,
                    "cc": email.metadata.cc,
                    "bcc": email.metadata.bcc,
                    "subject": email.metadata.subject,
                    "body_text": email.content.body_text,
                    "date": email.metadata.date,
                    "provider_id": email.metadata.provider_id,
                    "has_attachments": email.metadata.has_attachments,
                    "content_type": "text/plain",
                    "ingestion_date": datetime.datetime.now().isoformat(),
                    "ingestion_type": "mbox",
                    "conversation_id": email.metadata.conversation_id,
                    "folder": "mbox"
                }
                
                # Ajouter le document au batch
                batch_documents.append({
                    "tmp_path": filepath,
                    "metadata": metadata
                })
                
                # Log progress every 5 emails
                if email_idx % 5 == 0:
                    logger.info(f"[{email_idx+1}/{len(emails)}] Préparation des emails pour ingestion")
                
                # Traitement des pièces jointes
                if save_attachments and email.content.attachments and temp_dir:
                    attachment_paths = save_mbox_attachments(email, temp_dir)
                    
                    for idx, attachment_path in enumerate(attachment_paths):
                        # Nom du fichier de la pièce jointe
                        attachment_name = os.path.basename(attachment_path)
                        
                        # Générer un ID unique pour la pièce jointe
                        attachment_id = hashlib.md5(f"{email_id}_{attachment_name}_{idx}".encode('utf-8')).hexdigest()
                        
                        # Métadonnées pour la pièce jointe
                        attachment_metadata = {
                            "doc_id": attachment_id,
                            "path": f"/mbox/{user_id}/{email.metadata.conversation_id}/attachments/{attachment_name}",
                            "user": user_id,
                            "filename": attachment_name,
                            "provider_id": email.metadata.provider_id,
                            "parent_email_id": email_id,
                            "subject": email.metadata.subject,
                            "date": email.metadata.date,
                            "sender": email.metadata.sender,
                            "receiver": email.metadata.receiver,
                            "content_type": "attachment",
                            "ingestion_date": datetime.datetime.now().isoformat(),
                            "ingestion_type": "mbox_attachment",
                            "conversation_id": email.metadata.conversation_id,
                            "folder": "mbox"
                        }
                        
                        # Ajouter la pièce jointe au batch
                        batch_documents.append({
                            "tmp_path": attachment_path,
                            "metadata": attachment_metadata
                        })
                        
                        result["ingested_attachments"] += 1
                
                # # After preparing metadata, save to the email database
                # try:
                #     # Parse the email date string into a datetime object
                #     parsed_date = parse_email_date(email.metadata.date)
                    
                #     email_manager.save_email(
                #         user_id=user_id,
                #         email_id=email.metadata.provider_id,
                #         sender=email.metadata.sender,
                #         recipients=[email.metadata.receiver] if email.metadata.receiver else [],
                #         subject=email.metadata.subject or '',
                #         body=email.content.body_text or '',
                #         sent_date=parsed_date,
                #         source_type="mbox",
                #         conversation_id=email.metadata.conversation_id,
                #         folder="mbox"
                #     )
                # except Exception as e:
                #     logger.error(f"Error saving email to database: {e}")
                
                # Procéder par lots de batch_size documents
                if len(batch_documents) >= batch_size:
                    flush_batch(batch_documents, user_id, result, file_registry)
                    result["batches"] += 1
                    
            except Exception as e:
                error_msg = f"Erreur lors de la préparation de l'email {email.metadata.subject}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
        
        # Traiter les documents restants dans le batch
        if batch_documents:
            logger.info(f"Traitement du dernier lot de {len(batch_documents)} documents")
            flush_batch(batch_documents, user_id, result, file_registry)
            result["batches"] += 1
        
        # Nettoyer le répertoire temporaire
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Répertoire temporaire supprimé: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Erreur lors du nettoyage du répertoire temporaire: {cleanup_err}")
        
        # Marquer comme succès même s'il y a des erreurs individuelles
        result["success"] = result["items_ingested"] > 0 or result["ingested_attachments"] > 0
        
    except Exception as e:
        error_msg = f"Erreur globale lors de l'ingestion du fichier MBOX: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
        import traceback
        traceback.print_exc()
    
    # Calculer la durée
    result["duration"] = time.time() - start_time
    
    # Ajouter le nombre de lots traités au résultat
    result["batches_processed"] = result["batches"]
    
    logger.info(f"Ingestion MBOX terminée: {result['items_ingested']} emails ingérés avec "  
              f"{result['ingested_attachments']} pièces jointes en {result['duration']:.2f} secondes")
    
    # Si return_count est True, renvoyer uniquement le nombre d'emails traités
    if return_count:
        return result["items_ingested"]
        
    return result


def main():
    """Point d'entrée principal du script"""
    # Parser les arguments en ligne de commande
    parser = argparse.ArgumentParser(description="Script d'ingestion d'emails MBOX dans Qdrant")
    
    parser.add_argument("mbox_file", help="Chemin vers le fichier MBOX à ingérer")
    parser.add_argument("--limit", type=int, default=None, help="Nombre maximum d'emails à ingérer")
    parser.add_argument("--force-reingest", action="store_true", help="Forcer la réingestion même si l'email existe déjà")
    parser.add_argument("--no-attachments", action="store_true", help="Ne pas sauvegarder les pièces jointes")
    parser.add_argument("--user-id", default="default", help="Identifiant de l'utilisateur")
    parser.add_argument("--batch-size", type=int, default=10, help="Nombre de documents à traiter dans chaque lot")
    parser.add_argument("--min-date", help="Date minimale pour filtrer les emails (format YYYY-MM-DD)")
    
    args = parser.parse_args()
    
    # Convertir la date minimale en objet datetime si fournie
    min_date = None
    if args.min_date:
        try:
            min_date = datetime.datetime.fromisoformat(args.min_date)
            logger.info(f"Filtrage des emails antérieurs à {min_date}")
        except ValueError:
            logger.error(f"Format de date invalide: {args.min_date}. Utiliser le format YYYY-MM-DD")
            return 1
    
    # Exécuter l'ingestion
    result = ingest_mbox_to_qdrant(
        mbox_file=args.mbox_file,
        limit=args.limit,
        force_reingest=args.force_reingest,
        save_attachments=False,  #not args.no_attachments,
        user_id=args.user_id,
        min_date=min_date,
        batch_size=args.batch_size
    )
    
    # Afficher les résultats finaux
    if result["success"]:
        print(f"\n✅ Résumé de l'ingestion:")
        print(f"- Emails trouvés: {result['total_emails_found']}")
        print(f"- Emails ingérés: {result['items_ingested']}")
        print(f"- Pièces jointes ingérées: {result['ingested_attachments']}")
        print(f"- Emails ignorés: {result['skipped_emails']}")
        print(f"- Lots traités: {result.get('batches_processed', 0)}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\n⚠️  Attention: {len(result['errors'])} erreurs rencontrées")
            for error in result["errors"]:
                print(f"  - {error}")
    else:
        print("\n❌ L'ingestion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
