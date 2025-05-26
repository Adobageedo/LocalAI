# Email Sources for RAG Backend

Ce répertoire contient les implémentations des différentes sources d'emails pour le système d'ingestion de données RAG.

## Structure

- `base.py` - Classes et fonctions de base communes à toutes les sources d'emails
- `imap_source.py` - Implémentation de la source IMAP
- `gmail_source.py` - Implémentation de la source Gmail (API Google)
- `outlook_source.py` - Implémentation de la source Outlook (Microsoft Graph API)
- `__init__.py` - Fichier d'initialisation du package

## Installation des dépendances

Pour installer les dépendances nécessaires, exécutez :

```bash
pip install -r requirements.txt
```

## Utilisation

Le script principal `email_ingest_new.py` dans le répertoire parent peut être utilisé pour ingérer des emails à partir de différentes sources.

### Exemples d'utilisation

#### IMAP

```bash
python email_ingest_new.py --method imap \
    --imap_server imap.example.com \
    --imap_port 993 \
    --imap_user user@example.com \
    --imap_password yourpassword \
    --imap_folder INBOX \
    --collection_name rag_documents1536 \
    --user username \
    --limit 20
```

#### Gmail

```bash
python email_ingest_new.py --method gmail \
    --credentials_file path/to/credentials.json \
    --token_file path/to/token.json \
    --collection_name rag_documents1536 \
    --user username \
    --limit 20
```

#### Outlook

```bash
python email_ingest_new.py --method outlook \
    --client_id your_client_id \
    --client_secret your_client_secret \
    --tenant_id your_tenant_id \
    --user_id me \
    --collection_name rag_documents1536 \
    --user username \
    --limit 20
```

## Développement

Pour ajouter une nouvelle source d'emails, créez une nouvelle classe qui hérite de `EmailSource` et implémentez la méthode `fetch_emails`.

```python
from .base import EmailSource, EmailFetchResult, Email

class MyNewEmailSource(EmailSource):
    def fetch_emails(self, **kwargs) -> Tuple[EmailFetchResult, List[Email]]:
        # Implémentez la logique de récupération des emails ici
        # ...
        return result, emails
```

Ensuite, ajoutez la nouvelle source au fichier `__init__.py` et mettez à jour le script principal `email_ingest_new.py` pour prendre en charge cette nouvelle source.
