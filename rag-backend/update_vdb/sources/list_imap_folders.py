#!/usr/bin/env python3
"""
Script pour lister tous les dossiers disponibles sur un serveur IMAP.
Utile pour déterminer quels dossiers cibler lors de l'ingestion.
"""
import sys
import os
import imaplib
import re
import logging
import argparse
from typing import List, Tuple
import getpass

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("imap-folders")
logging.getLogger("imaplib").setLevel(logging.WARNING)

def list_imap_folders(
    imap_server: str, 
    imap_port: int, 
    imap_user: str, 
    imap_password: str
) -> Tuple[bool, List[Tuple[str, int]], str]:
    """
    Liste tous les dossiers disponibles sur un serveur IMAP avec le nombre d'emails dans chaque dossier.
    
    Args:
        imap_server: Nom ou adresse IP du serveur IMAP
        imap_port: Port du serveur IMAP (généralement 993 pour IMAPS)
        imap_user: Nom d'utilisateur pour la connexion IMAP
        imap_password: Mot de passe pour la connexion IMAP
        
    Returns:
        Tuple contenant:
        - Un booléen indiquant le succès (True) ou l'échec (False)
        - Une liste de tuples (nom_dossier, nombre_emails)
        - Un message d'erreur en cas d'échec
    """
    try:
        # Connexion au serveur IMAP
        if imap_port == 993:
            # Connexion sécurisée (IMAPS)
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        else:
            # Connexion non sécurisée (IMAP)
            mail = imaplib.IMAP4(imap_server, imap_port)
        
        # Authentification
        logger.info(f"Connexion au serveur IMAP {imap_server}:{imap_port} avec l'utilisateur {imap_user}")
        mail.login(imap_user, imap_password)
        
        # Lister tous les dossiers
        # Le format de retour est une liste de tuples (réponse, dossiers)
        # où dossiers est une liste de bytes contenant les informations des dossiers
        folders = []
        # Récupérer les dossiers avec LIST
        typ, data = mail.list()
        if typ != 'OK':
            return False, [], f"Erreur lors de la récupération des dossiers: {typ}"
        
        # Liste pour stocker les tuples (nom_dossier, nombre_emails)
        folder_counts = []
        
        # Extraire les noms des dossiers
        folders = []
        for item in data:
            if isinstance(item, bytes):
                decoded_item = item.decode('utf-8')
                # Format typique: '(\\HasNoChildren) "/" "INBOX"'
                # Utiliser une regex pour extraire le nom du dossier
                folder_match = re.search(r'"([^"]+)"$', decoded_item)
                if folder_match:
                    folder_name = folder_match.group(1)
                    folders.append(folder_name)
                    
        # Pour chaque dossier, compter le nombre d'emails
        for folder_name in folders:
            try:
                # Sélectionner le dossier
                logger.info(f"Sélection du dossier {folder_name} pour comptage")
                status, counts = mail.select(folder_name, readonly=True)
                
                if status == 'OK':
                    # Obtenir le nombre total d'emails dans le dossier
                    status, count_data = mail.search(None, 'ALL')
                    if status == 'OK':
                        # count_data est une liste contenant une chaîne d'IDs d'emails séparés par des espaces
                        if count_data[0]:
                            email_count = len(count_data[0].split())
                        else:
                            email_count = 0
                    else:
                        email_count = -1  # Indique une erreur de comptage
                else:
                    logger.warning(f"Impossible de sélectionner le dossier {folder_name}: {counts}")
                    email_count = -1  # Indique une erreur de sélection
                    
                folder_counts.append((folder_name, email_count))
                
            except Exception as e:
                logger.error(f"Erreur lors du comptage des emails dans {folder_name}: {str(e)}")
                folder_counts.append((folder_name, -1))  # -1 indique une erreur
                
        # Se déconnecter
        mail.logout()
        
        return True, folder_counts, ""
    
    except imaplib.IMAP4.error as e:
        return False, [], f"Erreur IMAP: {str(e)}"
    except Exception as e:
        return False, [], f"Erreur: {str(e)}"


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(description="Liste les dossiers disponibles sur un serveur IMAP.")
    parser.add_argument('--server', default="imap.gmail.com", help='Serveur IMAP')
    parser.add_argument('--port', type=int, default=993, help='Port IMAP')
    parser.add_argument('--user', default="edoardogenissel@gmail.com", help='Utilisateur IMAP')
    parser.add_argument('--password', default="dctzkzzqvfctjtln", help='Mot de passe IMAP ou mot de passe d\'application Google')
    
    args = parser.parse_args()
    
    # Demander le nom d'utilisateur si non fourni
    imap_user = args.user
    if not imap_user:
        imap_user = input("Nom d'utilisateur IMAP: ")
        
    # Demander le mot de passe si non fourni
    imap_password = args.password
    if not imap_password:
        imap_password = getpass.getpass("Mot de passe IMAP: ")
    
    # Récupérer les dossiers
    success, folders, error = list_imap_folders(
        args.server, 
        args.port, 
        imap_user, 
        imap_password
    )
    
    if not success:
        logger.error(f"Erreur: {error}")
        sys.exit(1)
    
    # Afficher les dossiers avec le nombre d'emails
    print("\n===== Dossiers IMAP disponibles =====")
    print("{:<4} {:<40} {:<10}".format("#", "Dossier", "Emails"))
    print("-" * 60)
    
    # Trier les dossiers par nombre d'emails (du plus grand au plus petit)
    sorted_folders = sorted(folders, key=lambda x: x[1] if x[1] >= 0 else -1, reverse=True)
    
    for i, (folder, count) in enumerate(sorted_folders, 1):
        # Formatter le nombre d'emails
        if count >= 0:
            count_str = str(count)
        else:
            count_str = "N/A"  # Impossible d'accéder
            
        print("{:<4} {:<40} {:<10}".format(i, folder, count_str))
    
    # Compter les dossiers accessibles
    accessible_folders = [folder for folder, count in folders if count >= 0]
    total_emails = sum(count for _, count in folders if count >= 0)
    
    print(f"\nTotal: {len(folders)} dossiers trouvés, {len(accessible_folders)} accessibles")
    print(f"Nombre total d'emails: {total_emails}")
    
    # Suggérer la commande pour l'ingestion avec les dossiers contenant le plus d'emails
    if sorted_folders:
        # Recommander les 3 dossiers ayant le plus d'emails et étant accessibles
        best_folders = [folder for folder, count in sorted_folders if count > 0][:3]
        if best_folders:
            suggested_folders = [f'"{folder}"' for folder in best_folders]
            print("\nPour ingérer des emails de ces dossiers, utilisez:")
            print(f"python ingest_imap_emails.py --user {imap_user} --server {args.server} --folders {' '.join(suggested_folders)}")
            print(f"\nPour ingérer uniquement le dossier le plus rempli ({best_folders[0]}):")
            print(f"python ingest_imap_emails.py --user {imap_user} --server {args.server} --folders \"{best_folders[0]}\"")
        else:
            print("\nAucun dossier accessible avec des emails n'a été trouvé.")
    else:
        print("\nAucun dossier trouvé.")
        
    # Afficher les dossiers inccessibles si présents
    inaccessible = [(folder, count) for folder, count in folders if count < 0]
    if inaccessible:
        print("\nDossiers inaccessibles:")
        for folder, _ in inaccessible:
            print(f"  - {folder}")
        print("\nCes dossiers peuvent nécessiter des droits d'accès spéciaux ou ne pas exister.")

    

if __name__ == "__main__":
    main()
