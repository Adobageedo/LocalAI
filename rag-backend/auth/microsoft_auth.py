import os
import msal
import logging
from typing import Optional, Dict

logger = logging.getLogger("outlook_auth")

# Define the required scopes for Outlook/Graph API
SCOPES = ['Mail.Read', 'User.Read']

def get_outlook_token(client_id: str, client_secret: str, tenant_id: str, token_path: str) -> Optional[Dict]:
    """
    Authentifie l'utilisateur et renvoie un token d'accès à Microsoft Graph.
    Args:
        client_id: ID client Azure
        client_secret: Secret client Azure
        tenant_id: ID du tenant Azure
        token_path: Chemin vers le fichier de token cache
    Returns:
        Token d'accès ou None en cas d'erreur
    """
    try:
        # Vérifier si un token cache existe
        token_cache = msal.SerializableTokenCache()
        if os.path.exists(token_path):
            with open(token_path, 'r') as token_file:
                token_cache.deserialize(token_file.read())
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        accounts = app.get_accounts()
        result = None
        if accounts:
            logger.info(f"Compte trouvé dans le cache : {accounts[0].get('username', 'compte inconnu')}")
            result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if not result:
            logger.info("Aucun token valide trouvé, lancement de l'authentification interactive")
            result = app.acquire_token_interactive(
                scopes=SCOPES,
                prompt="select_account"
            )
            # Vérifier si l'authentification a réussi
            if "error" in result:
                error_msg = result.get("error_description", "Erreur inconnue")
                logger.error(f"Erreur lors de l'authentification interactive: {error_msg}")
                raise Exception(f"Échec de l'authentification: {error_msg}")
        

        if token_cache.has_state_changed:
            with open(token_path, 'w') as token_file:
                token_file.write(token_cache.serialize())
        if "access_token" in result:
            username = "outlook_user"
            if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
                username = result["id_token_claims"]["preferred_username"]
            elif accounts and accounts[0].get("username"):
                username = accounts[0].get("username")
            logger.info(f"Authentification à Outlook réussie pour {username}")
            result["account"] = {"username": username}
            return result
        else:
            error_desc = result.get('error_description', 'Erreur inconnue')
            logger.error(f"Erreur d'authentification: {error_desc}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Outlook: {str(e)}")
        return None
