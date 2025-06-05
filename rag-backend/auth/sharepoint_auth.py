import os
import msal
import logging
import requests

logger = logging.getLogger("sharepoint_auth")

SCOPES = ["https://graph.microsoft.com/.default"]


def get_graph_token(client_id: str, client_secret: str, tenant_id: str, token_path: str) -> dict:
    """
    Authentifie l'utilisateur et renvoie un token d'accès Microsoft Graph.
    """
    token_cache = msal.SerializableTokenCache()
    if os.path.exists(token_path):
        with open(token_path, 'r') as token_file:
            token_cache.deserialize(token_file.read())
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        token_cache=token_cache
    )
    result = app.acquire_token_silent(SCOPES, account=None)
    if not result:
        result = app.acquire_token_for_client(scopes=SCOPES)
        if "error" in result:
            error_msg = result.get("error_description", "Erreur inconnue")
            logger.error(f"Erreur lors de l'authentification Graph: {error_msg}")
            raise Exception(f"Échec de l'authentification: {error_msg}")
    if token_cache.has_state_changed:
        with open(token_path, 'w') as token_file:
            token_file.write(token_cache.serialize())
    return result


def get_graph_session(token_dict: dict) -> requests.Session:
    """
    Renvoie une session requests authentifiée pour Microsoft Graph.
    """
    session = requests.Session()
    session.headers.update({
        'Authorization': f"Bearer {token_dict['access_token']}",
        'Accept': 'application/json'
    })
    return session
