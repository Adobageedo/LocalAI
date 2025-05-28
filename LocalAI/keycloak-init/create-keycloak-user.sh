#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="http://localhost:8081"
KEYCLOAK_REALM="newsflix"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"

# Nouveau utilisateur à créer
NEW_USERNAME="nouveautest2"
NEW_PASSWORD="password123"
USER_EMAIL="nouveautest2@example.com"
USER_FIRSTNAME="Nouveau"
USER_LASTNAME="Test"
USER_ROLE="user" # Rôle à attribuer

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

# 2. Créer un nouvel utilisateur
print_status "Création d'un nouvel utilisateur: ${NEW_USERNAME}..."
CREATE_USER_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "'${NEW_USERNAME}'",
        "enabled": true,
        "emailVerified": true,
        "email": "'${USER_EMAIL}'",
        "firstName": "'${USER_FIRSTNAME}'",
        "lastName": "'${USER_LASTNAME}'",
        "credentials": [{
            "type": "password",
            "value": "'${NEW_PASSWORD}'",
            "temporary": false
        }]
    }')

# Vérifier la réponse
HTTP_STATUS=$?
if [ $HTTP_STATUS -ne 0 ]; then
    print_error "Erreur lors de la création de l'utilisateur: ${CREATE_USER_RESPONSE}"
    
    # Vérifier si l'utilisateur existe déjà
    print_status "Vérification si l'utilisateur existe déjà..."
    EXISTING_USER=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${NEW_USERNAME}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}")
    
    if [[ $EXISTING_USER == *"${NEW_USERNAME}"* ]]; then
        print_status "L'utilisateur ${NEW_USERNAME} existe déjà."
    else
        exit 1
    fi
else
    print_status "Utilisateur ${NEW_USERNAME} créé avec succès."
fi

# 3. Obtenir l'ID de l'utilisateur
print_status "Récupération de l'ID utilisateur pour ${NEW_USERNAME}..."
USER_ID_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${NEW_USERNAME}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

USER_ID=$(echo $USER_ID_RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$USER_ID" ]; then
    print_error "Impossible de récupérer l'ID de l'utilisateur. Réponse: ${USER_ID_RESPONSE}"
    exit 1
fi

print_status "ID utilisateur récupéré: ${USER_ID}"

# 4. Récupérer l'ID du rôle
print_status "Récupération de l'ID du rôle ${USER_ROLE}..."
ROLE_ID_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${USER_ROLE}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

ROLE_ID=$(echo $ROLE_ID_RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$ROLE_ID" ]; then
    print_error "Impossible de récupérer l'ID du rôle. Réponse: ${ROLE_ID_RESPONSE}"
    exit 1
fi

print_status "ID du rôle récupéré: ${ROLE_ID}"

# 5. Attribuer le rôle à l'utilisateur
print_status "Attribution du rôle ${USER_ROLE} à l'utilisateur ${NEW_USERNAME}..."
ASSIGN_ROLE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '[{
        "id": "'${ROLE_ID}'",
        "name": "'${USER_ROLE}'",
        "composite": false,
        "clientRole": false,
        "containerId": "'${KEYCLOAK_REALM}'"
    }]')

# Vérifier la réponse
if [ $? -ne 0 ]; then
    print_error "Erreur lors de l'attribution du rôle: ${ASSIGN_ROLE_RESPONSE}"
    exit 1
fi

print_status "Rôle ${USER_ROLE} attribué avec succès à l'utilisateur ${NEW_USERNAME}."

# 6. Tester la connexion avec le nouvel utilisateur
print_status "Test de connexion avec l'utilisateur ${NEW_USERNAME}..."
LOGIN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${NEW_USERNAME}" \
    -d "password=${NEW_PASSWORD}" \
    -d "grant_type=password" \
    -d "client_id=rag-frontend")

# Extraire le token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$ACCESS_TOKEN" ]; then
    print_error "Impossible de se connecter avec le nouvel utilisateur. Réponse: ${LOGIN_RESPONSE}"
    exit 1
fi

print_status "Connexion réussie avec l'utilisateur ${NEW_USERNAME}."
print_status "Test de création d'utilisateur terminé avec succès!"
