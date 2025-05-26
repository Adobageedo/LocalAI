#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="http://localhost:8081"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
REALM_NAME="newsflix"
CLIENT_ID="rag-frontend"
REDIRECT_URI="http://localhost:5173/*"

# Fonction d'affichage de messages
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que Keycloak est en cours d'exécution
print_status "Vérification que Keycloak est en cours d'exécution..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" ${KEYCLOAK_URL})
if [[ "$HEALTH_CHECK" != "200" && "$HEALTH_CHECK" != "302" ]]; then
    print_error "Keycloak n'est pas accessible. Vérifiez que le serveur est en cours d'exécution. Code HTTP: $HEALTH_CHECK"
    exit 1
fi

print_status "Keycloak est en cours d'exécution (code: $HEALTH_CHECK)."

# 1. Obtenir un token d'administration
print_status "Obtention d'un token d'administration..."
ADMIN_TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${ADMIN_USERNAME}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli")

# Extraire le token
ADMIN_TOKEN=$(echo $ADMIN_TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$ADMIN_TOKEN" ]; then
    print_error "Impossible d'obtenir un token d'administration. Réponse: ${ADMIN_TOKEN_RESPONSE}"
    exit 1
fi

print_status "Token d'administration obtenu avec succès."

# 2. Vérifier si le realm existe
print_status "Vérification de l'existence du realm ${REALM_NAME}..."
REALM_CHECK=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -o /dev/null -w "%{http_code}")

# 3. Créer le realm s'il n'existe pas
if [ "$REALM_CHECK" == "404" ]; then
    print_status "Le realm ${REALM_NAME} n'existe pas, création en cours..."
    CREATE_REALM_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "realm": "'${REALM_NAME}'",
            "enabled": true,
            "displayName": "'${REALM_NAME}'",
            "accessTokenLifespan": 300,
            "ssoSessionIdleTimeout": 1800,
            "ssoSessionMaxLifespan": 36000,
            "offlineSessionIdleTimeout": 2592000
        }')
    
    # Vérifier la création
    REALM_CHECK_AFTER=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -o /dev/null -w "%{http_code}")
    
    if [ "$REALM_CHECK_AFTER" != "200" ]; then
        print_error "Erreur lors de la création du realm: ${CREATE_REALM_RESPONSE}"
        exit 1
    fi
    
    print_status "Realm ${REALM_NAME} créé avec succès."
else
    print_status "Le realm ${REALM_NAME} existe déjà."
fi

# 4. Créer le client dans le realm s'il n'existe pas
print_status "Vérification de l'existence du client ${CLIENT_ID}..."
CLIENT_CHECK=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients?clientId=${CLIENT_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

if [[ $CLIENT_CHECK == "[]" ]]; then
    print_status "Le client ${CLIENT_ID} n'existe pas, création en cours..."
    CREATE_CLIENT_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "clientId": "'${CLIENT_ID}'",
            "enabled": true,
            "publicClient": true,
            "redirectUris": ["'${REDIRECT_URI}'"],
            "webOrigins": ["+"],
            "standardFlowEnabled": true,
            "directAccessGrantsEnabled": true,
            "serviceAccountsEnabled": false,
            "fullScopeAllowed": true,
            "frontchannelLogout": true
        }')
    
    print_status "Client ${CLIENT_ID} créé avec succès."
else
    print_status "Le client ${CLIENT_ID} existe déjà."
fi

# 5. Créer les rôles si nécessaire
print_status "Création des rôles de base si nécessaires..."

# Créer le rôle admin
ADMIN_ROLE_CHECK=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/admin" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -o /dev/null -w "%{http_code}")

if [ "$ADMIN_ROLE_CHECK" == "404" ]; then
    print_status "Création du rôle admin..."
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "admin",
            "description": "Administrateur avec tous les droits"
        }'
else
    print_status "Le rôle admin existe déjà."
fi

# Créer le rôle user
USER_ROLE_CHECK=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/user" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -o /dev/null -w "%{http_code}")

if [ "$USER_ROLE_CHECK" == "404" ]; then
    print_status "Création du rôle user..."
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "user",
            "description": "Utilisateur standard"
        }'
else
    print_status "Le rôle user existe déjà."
fi

print_status "Configuration du realm ${REALM_NAME} terminée avec succès!"
