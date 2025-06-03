#!/usr/bin/env python3
"""
Script pour explorer la base de données MinIO et lister les dossiers et fichiers par utilisateur.
Ce script permet de visualiser la structure des données dans MinIO, organisée par utilisateur.
"""

import os
import sys
import argparse
import logging
from collections import defaultdict
from datetime import datetime
from tabulate import tabulate
from minio import Minio
from minio.error import S3Error

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Configuration MinIO depuis les variables d'environnement
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "miniouser")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "miniopassword")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "documents")
USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"

def get_minio_client():
    """
    Crée et retourne un client MinIO.
    
    Returns:
        Minio: Client MinIO configuré
    """
    try:
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=USE_SSL
        )
        return client
    except Exception as e:
        logger.error(f"Erreur lors de la création du client MinIO: {str(e)}")
        sys.exit(1)

def format_size(size_bytes):
    """
    Formate la taille en bytes en une chaîne lisible (KB, MB, GB).
    
    Args:
        size_bytes: Taille en bytes
        
    Returns:
        str: Taille formatée
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def format_datetime(dt):
    """
    Formate un objet datetime en chaîne lisible.
    
    Args:
        dt: Objet datetime
        
    Returns:
        str: Date formatée
    """
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def extract_user_id(object_name):
    """
    Extrait l'ID utilisateur à partir du nom d'objet.
    Format attendu: user_{user_id}/...
    
    Args:
        object_name: Nom de l'objet MinIO
        
    Returns:
        str: ID utilisateur ou None si non trouvé
    """
    parts = object_name.split('/', 1)
    if not parts:
        return None
    
    user_part = parts[0]
    if user_part.startswith("user_"):
        return user_part[5:]  # Enlever le préfixe "user_"
    return None

def is_directory(obj):
    """
    Détermine si un objet est un dossier.
    Dans MinIO, les dossiers sont généralement représentés par des objets vides se terminant par '/'
    ou par des objets avec une taille de 0 byte.
    
    Args:
        obj: Objet MinIO ou nom d'objet
        
    Returns:
        bool: True si c'est un dossier, False sinon
    """
    # Si on reçoit un objet MinIO complet
    if hasattr(obj, 'object_name') and hasattr(obj, 'size'):
        # Les dossiers ont généralement une taille de 0
        if obj.size == 0 and obj.object_name.endswith('/'):
            return True
        # Vérifier l'extension pour les fichiers connus
        name = obj.object_name.lower()
        for ext in ['.pdf', '.docx', '.txt', '.md', '.csv', '.json', '.ppt', '.pptx']:
            if name.endswith(ext):
                return False
        return obj.object_name.endswith('/') or '.folder' in obj.object_name
    else:
        # Si on reçoit juste un nom d'objet
        object_name = obj
        return object_name.endswith('/') or '.folder' in object_name

def get_path_parts(object_name, user_id):
    """
    Divise le chemin d'un objet en parties (dossiers).
    
    Args:
        object_name: Nom de l'objet MinIO
        user_id: ID de l'utilisateur
        
    Returns:
        list: Liste des parties du chemin
    """
    # Enlever le préfixe utilisateur
    user_prefix = f"user_{user_id}/"
    if object_name.startswith(user_prefix):
        path = object_name[len(user_prefix):]
    else:
        path = object_name
    
    # Diviser le chemin en parties
    if path:
        return path.rstrip('/').split('/')
    return []

def list_minio_contents(args):
    """
    Liste le contenu de MinIO par utilisateur.
    
    Args:
        args: Arguments de ligne de commande
    """
    client = get_minio_client()
    
    # Vérifier si le bucket existe
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            logger.error(f"Le bucket '{MINIO_BUCKET}' n'existe pas.")
            return
    except S3Error as e:
        logger.error(f"Erreur lors de la vérification du bucket: {str(e)}")
        return
    
    # Récupérer tous les objets
    objects = list(client.list_objects(MINIO_BUCKET, recursive=True))
    
    if not objects:
        logger.info(f"Aucun objet trouvé dans le bucket '{MINIO_BUCKET}'.")
        return
    
    # Organiser les objets par utilisateur
    user_objects = defaultdict(list)
    unknown_objects = []
    
    for obj in objects:
        user_id = extract_user_id(obj.object_name)
        if user_id:
            # Si un utilisateur spécifique est demandé, filtrer
            if args.user and user_id != args.user:
                continue
            user_objects[user_id].append(obj)
        else:
            unknown_objects.append(obj)
    
    # Afficher les statistiques globales
    total_users = len(user_objects)
    total_objects = sum(len(objs) for objs in user_objects.values()) + len(unknown_objects)
    total_size = sum(obj.size for user_objs in user_objects.values() for obj in user_objs) + sum(obj.size for obj in unknown_objects)
    
    print("\n" + "=" * 80)
    print(f"STATISTIQUES GLOBALES MINIO - BUCKET: {MINIO_BUCKET}")
    print("=" * 80)
    print(f"Nombre total d'utilisateurs: {total_users}")
    print(f"Nombre total d'objets: {total_objects}")
    print(f"Taille totale: {format_size(total_size)}")
    print("=" * 80 + "\n")
    
    # Afficher les objets par utilisateur
    for user_id, user_objs in sorted(user_objects.items()):
        if args.summary:
            # Mode résumé: afficher seulement les statistiques par utilisateur
            user_files = [obj for obj in user_objs if not is_directory(obj)]
            user_dirs = [obj for obj in user_objs if is_directory(obj)]
            user_size = sum(obj.size for obj in user_objs)
            print(f"Utilisateur: {user_id}")
            print(f"  Nombre de fichiers: {len(user_files)}")
            print(f"  Nombre de dossiers: {len(user_dirs)}")
            print(f"  Taille totale: {format_size(user_size)}")
            print()
        else:
            # Mode détaillé: afficher tous les fichiers et dossiers
            print("\n" + "-" * 80)
            print(f"UTILISATEUR: {user_id}")
            print("-" * 80)
            
            # Organiser les fichiers par dossier
            folder_structure = defaultdict(list)
            for obj in user_objs:
                path_parts = get_path_parts(obj.object_name, user_id)
                if not path_parts:
                    continue
                
                if len(path_parts) == 1 or (is_directory(obj) and len(path_parts) == 0):
                    # Fichier ou dossier à la racine
                    folder_structure["/"].append(obj)
                else:
                    # Fichier ou dossier dans un sous-dossier
                    folder = "/".join(path_parts[:-1]) if not is_directory(obj) else "/".join(path_parts)
                    folder_structure[folder].append(obj)
            
            # Afficher la structure par dossier
            for folder, folder_objs in sorted(folder_structure.items()):
                print(f"\nDossier: {folder or '/'}")
                
                # Préparer les données pour le tableau
                table_data = []
                for obj in sorted(folder_objs, key=lambda x: x.object_name):
                    name = obj.object_name.split("/")[-2] if is_directory(obj) else obj.object_name.split("/")[-1]
                    if not name and is_directory(obj):
                        name = obj.object_name.split("/")[-3] + "/"
                    
                    obj_type = "Dossier" if is_directory(obj) else "Fichier"
                    size = "-" if is_directory(obj) else format_size(obj.size)
                    last_modified = format_datetime(obj.last_modified)
                    
                    table_data.append([name, obj_type, size, last_modified])
                
                # Afficher le tableau
                if table_data:
                    print(tabulate(table_data, headers=["Nom", "Type", "Taille", "Dernière modification"], tablefmt="grid"))
                else:
                    print("  (Dossier vide)")
    
    # Afficher les objets sans utilisateur identifié
    if unknown_objects and not args.user:
        print("\n" + "-" * 80)
        print("OBJETS SANS UTILISATEUR IDENTIFIÉ")
        print("-" * 80)
        
        table_data = []
        for obj in sorted(unknown_objects, key=lambda x: x.object_name):
            obj_type = "Dossier" if is_directory(obj) else "Fichier"
            size = "-" if is_directory(obj) else format_size(obj.size)
            last_modified = format_datetime(obj.last_modified)
            
            table_data.append([obj.object_name, obj_type, size, last_modified])
        
        if table_data:
            print(tabulate(table_data, headers=["Chemin complet", "Type", "Taille", "Dernière modification"], tablefmt="grid"))
        else:
            print("  (Aucun objet sans utilisateur)")

def main():
    # Variables globales pour la configuration
    global MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, USE_SSL
    
    parser = argparse.ArgumentParser(description="Explorer la base de données MinIO par utilisateur")
    parser.add_argument("--endpoint", help=f"Endpoint MinIO (défaut: {MINIO_ENDPOINT})")
    parser.add_argument("--access-key", help="Clé d'accès MinIO")
    parser.add_argument("--secret-key", help="Clé secrète MinIO")
    parser.add_argument("--bucket", help=f"Nom du bucket (défaut: {MINIO_BUCKET})")
    parser.add_argument("--use-ssl", action="store_true", help="Utiliser SSL pour la connexion")
    parser.add_argument("--user", help="Filtrer par ID utilisateur spécifique")
    parser.add_argument("--summary", action="store_true", help="Afficher uniquement un résumé par utilisateur")
    
    args = parser.parse_args()
    
    if args.endpoint:
        MINIO_ENDPOINT = args.endpoint
    if args.access_key:
        MINIO_ACCESS_KEY = args.access_key
    if args.secret_key:
        MINIO_SECRET_KEY = args.secret_key
    if args.bucket:
        MINIO_BUCKET = args.bucket
    if args.use_ssl:
        USE_SSL = True
    
    print(f"Connexion à MinIO: {MINIO_ENDPOINT} (SSL: {USE_SSL})")
    print(f"Bucket: {MINIO_BUCKET}")
    
    try:
        list_minio_contents(args)
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution du script: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
