"""
Adaptateur pour la connexion et l'extraction d'emails via IMAP.
"""

import imaplib
import email
import email.header
import email.utils
import logging
import re
import html
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import quopri

from backend.core.config import (
    IMAP_SERVER,
    IMAP_PORT,
    IMAP_USERNAME,
    IMAP_PASSWORD,
    IMAP_SSL
)
from backend.core.logger import log

class IMAPAdapter:
    """
    Adaptateur pour extraire des emails via IMAP.
    """
    
    def __init__(
        self, 
        server: str = None, 
        port: int = None, 
        username: str = None, 
        password: str = None, 
        use_ssl: bool = True
    ):
        """
        Initialise la connexion IMAP.
        
        Args:
            server (str, optional): Serveur IMAP. Par défaut None (utilise config).
            port (int, optional): Port IMAP. Par défaut None (utilise config).
            username (str, optional): Nom d'utilisateur. Par défaut None (utilise config).
            password (str, optional): Mot de passe. Par défaut None (utilise config).
            use_ssl (bool, optional): Utiliser SSL. Par défaut True.
        """
        self.server = server or IMAP_SERVER
        self.port = port or IMAP_PORT
        self.username = username or IMAP_USERNAME
        self.password = password or IMAP_PASSWORD
        self.use_ssl = IMAP_SSL if use_ssl is None else use_ssl
        
        self.imap = None
        self.connected = False
        
        # Nécessaire pour l'ingestion de Newsflix.fr
        if self.server == "mail.newsflix.fr":
            self.username = self.username or "noreply@newsflix.fr"
            self.password = self.password or "enzo789luigi"
            
        log.info(f"IMAPAdapter initialisé pour {self.server}:{self.port}")
        
    def connect(self) -> bool:
        """
        Établit une connexion au serveur IMAP.
        
        Returns:
            bool: True si la connexion est réussie, False sinon
        """
        try:
            # Vérifier si les informations de connexion sont complètes
            if not all([self.server, self.port, self.username, self.password]):
                log.error("Informations de connexion IMAP incomplètes")
                return False
                
            # Créer la connexion IMAP
            if self.use_ssl:
                self.imap = imaplib.IMAP4_SSL(self.server, self.port)
            else:
                self.imap = imaplib.IMAP4(self.server, self.port)
                
            # Se connecter au serveur
            self.imap.login(self.username, self.password)
            self.connected = True
            
            log.info(f"Connexion IMAP établie avec succès à {self.server}")
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la connexion IMAP à {self.server}: {str(e)}")
            self.connected = False
            return False
            
    def disconnect(self) -> None:
        """
        Ferme la connexion au serveur IMAP.
        """
        if self.imap and self.connected:
            try:
                self.imap.logout()
                log.info("Déconnexion IMAP réussie")
            except Exception as e:
                log.error(f"Erreur lors de la déconnexion IMAP: {str(e)}")
                
            self.connected = False
            self.imap = None
    
    def __enter__(self):
        """
        Support pour le gestionnaire de contexte (with).
        """
        self.connect()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Ferme la connexion en sortant du gestionnaire de contexte.
        """
        self.disconnect()
    
    def list_mailboxes(self) -> List[str]:
        """
        Liste les boîtes aux lettres disponibles sur le serveur.
        
        Returns:
            List[str]: Liste des noms de boîtes aux lettres
        """
        if not self.connected and not self.connect():
            log.error("Impossible de lister les boîtes aux lettres: non connecté")
            return []
            
        try:
            _, mailbox_data = self.imap.list()
            mailboxes = []
            
            for item in mailbox_data:
                if isinstance(item, bytes):
                    # Décoder la chaîne de caractères
                    decoded = item.decode('utf-8')
                    # Extraire le nom de la boîte aux lettres
                    match = re.search(r'"([^"]+)"$', decoded)
                    if match:
                        mailboxes.append(match.group(1))
                    else:
                        match = re.search(r' ([^ ]+)$', decoded)
                        if match:
                            mailboxes.append(match.group(1))
            
            return mailboxes
        except Exception as e:
            log.exception(f"Erreur lors de la liste des boîtes aux lettres: {str(e)}")
            return []
    
    def select_mailbox(self, mailbox: str = "INBOX") -> int:
        """
        Sélectionne une boîte aux lettres.
        
        Args:
            mailbox (str, optional): Nom de la boîte aux lettres. Par défaut "INBOX".
            
        Returns:
            int: Nombre de messages dans la boîte sélectionnée, -1 en cas d'erreur
        """
        if not self.connected and not self.connect():
            log.error(f"Impossible de sélectionner la boîte {mailbox}: non connecté")
            return -1
            
        try:
            status, data = self.imap.select(mailbox)
            if status == "OK":
                message_count = int(data[0])
                log.debug(f"Boîte {mailbox} sélectionnée, {message_count} messages trouvés")
                return message_count
            else:
                log.error(f"Erreur lors de la sélection de la boîte {mailbox}: {status}")
                return -1
        except Exception as e:
            log.exception(f"Erreur lors de la sélection de la boîte {mailbox}: {str(e)}")
            return -1
    
    def search_emails(self, criteria: str = "ALL") -> List[str]:
        """
        Recherche des emails selon des critères IMAP.
        
        Args:
            criteria (str, optional): Critères de recherche IMAP. Par défaut "ALL".
            
        Returns:
            List[str]: Liste des IDs d'emails correspondants
        """
        if not self.connected and not self.connect():
            log.error(f"Impossible de rechercher des emails: non connecté")
            return []
            
        try:
            status, data = self.imap.search(None, criteria)
            if status != "OK":
                log.error(f"Erreur lors de la recherche d'emails: {status}")
                return []
                
            # Convertir les IDs de bytes en str
            email_ids = data[0].decode().split()
            log.debug(f"{len(email_ids)} emails trouvés avec les critères: {criteria}")
            return email_ids
        except Exception as e:
            log.exception(f"Erreur lors de la recherche d'emails: {str(e)}")
            return []
    
    def get_recent_emails(self, count: int = 10, mailbox: str = "INBOX") -> List[str]:
        """
        Récupère les IDs des emails récents.
        
        Args:
            count (int, optional): Nombre d'emails à récupérer. Par défaut 10.
            mailbox (str, optional): Boîte aux lettres à interroger. Par défaut "INBOX".
            
        Returns:
            List[str]: Liste des IDs d'emails récents
        """
        # Sélectionner la boîte aux lettres
        message_count = self.select_mailbox(mailbox)
        if message_count <= 0:
            return []
            
        # Calculer l'intervalle d'IDs pour les messages récents
        start_id = max(1, message_count - count + 1)
        end_id = message_count
        
        # Construire la requête d'intervalle
        id_range = f"{start_id}:{end_id}"
        
        try:
            status, data = self.imap.search(None, f"({id_range})")
            if status != "OK":
                log.error(f"Erreur lors de la récupération des emails récents: {status}")
                return []
                
            email_ids = data[0].decode().split()
            log.debug(f"{len(email_ids)} emails récents récupérés")
            return email_ids
        except Exception as e:
            log.exception(f"Erreur lors de la récupération des emails récents: {str(e)}")
            return []
    
    def get_email(self, email_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère un email complet par son ID.
        
        Args:
            email_id (str): ID de l'email à récupérer
            
        Returns:
            Optional[Dict[str, Any]]: Données de l'email ou None en cas d'erreur
        """
        if not self.connected and not self.connect():
            log.error(f"Impossible de récupérer l'email {email_id}: non connecté")
            return None
            
        try:
            status, data = self.imap.fetch(email_id, "(RFC822)")
            if status != "OK":
                log.error(f"Erreur lors de la récupération de l'email {email_id}: {status}")
                return None
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Extraire les en-têtes
            subject = self._decode_header(msg["Subject"])
            from_address = self._decode_header(msg["From"])
            to_address = self._decode_header(msg["To"])
            date_str = msg["Date"]
            
            # Convertir la date en format ISO
            try:
                date_tuple = email.utils.parsedate_tz(date_str)
                date_obj = datetime.fromtimestamp(email.utils.mktime_tz(date_tuple))
                date_iso = date_obj.isoformat()
            except:
                date_iso = date_str
            
            # Extraire le contenu
            body_text, body_html = self._get_email_body(msg)
            
            # Construire l'objet email
            email_obj = {
                "id": email_id,
                "subject": subject,
                "from": from_address,
                "to": to_address,
                "date": date_iso,
                "body_text": body_text,
                "body_html": body_html,
                "has_attachments": self._has_attachments(msg),
                "headers": {
                    key: self._decode_header(msg[key])
                    for key in msg.keys()
                }
            }
            
            return email_obj
        except Exception as e:
            log.exception(f"Erreur lors de la récupération de l'email {email_id}: {str(e)}")
            return None
    
    def _decode_header(self, header_value: Optional[str]) -> str:
        """
        Décode les en-têtes d'email.
        
        Args:
            header_value (Optional[str]): Valeur d'en-tête à décoder
            
        Returns:
            str: En-tête décodé
        """
        if header_value is None:
            return ""
            
        try:
            decoded_header = email.header.decode_header(header_value)
            header_parts = []
            
            for part, encoding in decoded_header:
                if isinstance(part, bytes):
                    if encoding:
                        try:
                            header_parts.append(part.decode(encoding))
                        except:
                            # Fallback en cas d'erreur de décodage
                            try:
                                header_parts.append(part.decode('utf-8', errors='replace'))
                            except:
                                header_parts.append(part.decode('latin-1', errors='replace'))
                    else:
                        try:
                            header_parts.append(part.decode('utf-8', errors='replace'))
                        except:
                            header_parts.append(part.decode('latin-1', errors='replace'))
                else:
                    header_parts.append(str(part))
                    
            return "".join(header_parts)
        except Exception as e:
            log.error(f"Erreur lors du décodage d'en-tête: {str(e)}")
            # Fallback: retourner la valeur brute
            return str(header_value)
    
    def _get_email_body(self, msg) -> Tuple[str, str]:
        """
        Extrait le corps de l'email en texte et HTML.
        
        Args:
            msg: Email message object
            
        Returns:
            Tuple[str, str]: (corps texte, corps HTML)
        """
        body_text = ""
        body_html = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                
                # Ignorer les pièces jointes
                if "attachment" in content_disposition:
                    continue
                    
                # Extraire le corps
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                    
                # Décoder le contenu
                charset = part.get_content_charset()
                if charset is None:
                    charset = 'utf-8'
                    
                try:
                    decoded_payload = payload.decode(charset, errors='replace')
                except:
                    try:
                        decoded_payload = payload.decode('utf-8', errors='replace')
                    except:
                        decoded_payload = payload.decode('latin-1', errors='replace')
                
                # Stocker selon le type de contenu
                if content_type == "text/plain":
                    body_text += decoded_payload
                elif content_type == "text/html":
                    body_html += decoded_payload
        else:
            # Email non multipart
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or 'utf-8'
                
                try:
                    decoded_payload = payload.decode(charset, errors='replace')
                except:
                    try:
                        decoded_payload = payload.decode('utf-8', errors='replace')
                    except:
                        decoded_payload = payload.decode('latin-1', errors='replace')
                
                if msg.get_content_type() == "text/plain":
                    body_text = decoded_payload
                elif msg.get_content_type() == "text/html":
                    body_html = decoded_payload
        
        # Si nous avons uniquement du HTML, extraire le texte
        if body_html and not body_text:
            try:
                soup = BeautifulSoup(body_html, "html.parser")
                body_text = soup.get_text(separator="\n")
            except Exception as e:
                log.error(f"Erreur lors de l'extraction du texte depuis HTML: {str(e)}")
        
        # Nettoyer le texte
        body_text = self._clean_text(body_text)
        
        return body_text, body_html
    
    def _clean_text(self, text: str) -> str:
        """
        Nettoie le texte des emails.
        
        Args:
            text (str): Texte à nettoyer
            
        Returns:
            str: Texte nettoyé
        """
        if not text:
            return ""
            
        # Convertir les entités HTML
        text = html.unescape(text)
        
        # Supprimer les sauts de ligne multiples
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Supprimer les espaces en début et fin
        text = text.strip()
        
        return text
    
    def _has_attachments(self, msg) -> bool:
        """
        Vérifie si l'email a des pièces jointes.
        
        Args:
            msg: Email message object
            
        Returns:
            bool: True si l'email a des pièces jointes, False sinon
        """
        if not msg.is_multipart():
            return False
            
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition"))
            if "attachment" in content_disposition:
                return True
                
        return False
    
    def get_emails_by_criteria(
        self, 
        criteria: str, 
        max_emails: int = 100,
        mailbox: str = "INBOX"
    ) -> List[Dict[str, Any]]:
        """
        Récupère des emails selon des critères IMAP.
        
        Args:
            criteria (str): Critères de recherche IMAP
            max_emails (int, optional): Nombre maximum d'emails à récupérer. Par défaut 100.
            mailbox (str, optional): Boîte aux lettres à interroger. Par défaut "INBOX".
            
        Returns:
            List[Dict[str, Any]]: Liste des emails correspondants
        """
        # Sélectionner la boîte aux lettres
        self.select_mailbox(mailbox)
        
        # Rechercher les IDs d'emails
        email_ids = self.search_emails(criteria)
        
        # Limiter le nombre d'emails
        if max_emails > 0:
            email_ids = email_ids[-max_emails:]
        
        # Récupérer les emails complets
        emails = []
        for email_id in email_ids:
            email_obj = self.get_email(email_id)
            if email_obj:
                emails.append(email_obj)
                
        log.info(f"{len(emails)}/{len(email_ids)} emails récupérés avec les critères: {criteria}")
        return emails
    
    def get_emails_since(
        self, 
        days: int = 7, 
        max_emails: int = 100,
        mailbox: str = "INBOX"
    ) -> List[Dict[str, Any]]:
        """
        Récupère les emails depuis un certain nombre de jours.
        
        Args:
            days (int, optional): Nombre de jours. Par défaut 7.
            max_emails (int, optional): Nombre maximum d'emails à récupérer. Par défaut 100.
            mailbox (str, optional): Boîte aux lettres à interroger. Par défaut "INBOX".
            
        Returns:
            List[Dict[str, Any]]: Liste des emails correspondants
        """
        # Calculer la date limite
        since_date = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
        
        # Construire les critères
        criteria = f'(SINCE "{since_date}")'
        
        return self.get_emails_by_criteria(criteria, max_emails, mailbox)
