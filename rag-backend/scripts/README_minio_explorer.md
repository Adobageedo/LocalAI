# MinIO Explorer Script

Ce script permet d'explorer la base de données MinIO et de lister les dossiers et fichiers par utilisateur. Il est particulièrement utile pour visualiser la structure des données dans MinIO et vérifier l'état de l'ingestion des documents.

## Fonctionnalités

- Affichage des statistiques globales (nombre d'utilisateurs, nombre de fichiers, taille totale)
- Exploration détaillée des fichiers et dossiers par utilisateur
- Affichage des métadonnées (taille, date de modification)
- Filtrage par utilisateur spécifique
- Mode résumé pour un aperçu rapide

## Prérequis

- Python 3.6+
- Bibliothèques: `minio`, `tabulate`

## Installation

Les dépendances peuvent être installées avec pip:

```bash
pip install minio tabulate
```

## Utilisation

### Exécution basique

```bash
python minio_explorer.py
```

### Options disponibles

```
--endpoint ENDPOINT     Endpoint MinIO (défaut: valeur de MINIO_ENDPOINT ou "minio:9000")
--access-key KEY        Clé d'accès MinIO (défaut: valeur de MINIO_ACCESS_KEY)
--secret-key KEY        Clé secrète MinIO (défaut: valeur de MINIO_SECRET_KEY)
--bucket BUCKET         Nom du bucket (défaut: valeur de MINIO_BUCKET ou "documents")
--use-ssl               Utiliser SSL pour la connexion
--user USER_ID          Filtrer par ID utilisateur spécifique
--summary               Afficher uniquement un résumé par utilisateur
```

### Exemples

1. Afficher tous les fichiers pour tous les utilisateurs:
   ```bash
   python minio_explorer.py
   ```

2. Afficher les fichiers d'un utilisateur spécifique:
   ```bash
   python minio_explorer.py --user "user123"
   ```

3. Afficher uniquement un résumé par utilisateur:
   ```bash
   python minio_explorer.py --summary
   ```

4. Utiliser un endpoint MinIO personnalisé:
   ```bash
   python minio_explorer.py --endpoint "localhost:9000" --use-ssl
   ```

## Structure des données

Le script s'attend à ce que les fichiers dans MinIO soient organisés selon la structure suivante:
```
user_{user_id}/path/to/file.pdf
```

Cette structure est cohérente avec l'organisation utilisée par le système d'ingestion de documents dans votre application LocalAI.

## Intégration avec le système d'ingestion

Ce script complète le système d'ingestion existant qui utilise:
- Un registre de fichiers JSON pour suivre les fichiers ingérés
- Le calcul de hash SHA-256 pour détecter les modifications de contenu
- VectorStoreManager pour la gestion des documents dans Qdrant

Il permet de vérifier visuellement que les fichiers sont correctement stockés dans MinIO avant leur ingestion dans Qdrant.
