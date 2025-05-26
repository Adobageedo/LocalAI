#!/bin/bash
# Script de test pour l'API Keycloak
# Ce script teste les différentes routes d'authentification du backend

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
API_URL=${API_URL:-"http://localhost:8000"}
USERNAME=${USERNAME:-"testuser"}
PASSWORD=${PASSWORD:-"password"}

# Vérifier que l'API est en cours d'exécution
print_status "Vérification que l'API est en cours d'exécution..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/api/health)

if [ "$HEALTH_CHECK" == "200" ] || [ "$HEALTH_CHECK" == "404" ] || [ "$HEALTH_CHECK" == "401" ]; then
    print_status "L'API est en cours d'exécution (code: $HEALTH_CHECK)."
    print_status "Si vous voyez le code 401, c'est normal car /api/health est protégé par authentification."
else
    print_error "L'API n'est pas accessible. Veuillez la démarrer. (code: $HEALTH_CHECK)"
    exit 1
fi

# 1. Obtenir un token d'accès directement avec username/password
print_status "Test 1: Obtention d'un token avec les identifiants utilisateur..."
TOKEN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "'${USERNAME}'",
        "password": "'${PASSWORD}'"
    }')

echo $TOKEN_RESPONSE | jq '.'

# Extraire les tokens
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
REFRESH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.refresh_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    print_error "Échec de l'obtention du token d'accès."
    exit 1
else
    print_status "Token d'accès obtenu avec succès."
fi

# 2. Valider le token
print_status "Test 2: Validation du token d'accès..."
print_status "Débugging: Ajouter -v pour voir les détails de la requête HTTP si nécessaire"
VALIDATE_RESPONSE=$(curl -s -X GET "${API_URL}/api/auth/validate" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

# Afficher la réponse brute pour débug
echo "Réponse brute: $VALIDATE_RESPONSE"

# Essayer de formatter en JSON si possible
echo "Réponse formatée:"
echo $VALIDATE_RESPONSE | jq '.' || echo "Erreur de parsing JSON, affichage du texte brut"

# 3. Obtenir les informations utilisateur
print_status "Test 3: Récupération des informations utilisateur..."
USERINFO_RESPONSE=$(curl -s -X GET "${API_URL}/api/auth/userinfo" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $USERINFO_RESPONSE | jq '.'

# 4. Rafraîchir le token d'accès
print_status "Test 4: Rafraîchissement du token d'accès..."
REFRESH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -d '{
        "refresh_token": "'${REFRESH_TOKEN}'"
    }')

echo $REFRESH_RESPONSE | jq '.'

# Extraire le nouveau token d'accès
NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.access_token')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.refresh_token')

if [ "$NEW_ACCESS_TOKEN" == "null" ] || [ -z "$NEW_ACCESS_TOKEN" ]; then
    print_warning "Échec du rafraîchissement du token."
else
    print_status "Token rafraîchi avec succès."
    ACCESS_TOKEN=$NEW_ACCESS_TOKEN
    REFRESH_TOKEN=$NEW_REFRESH_TOKEN
fi

# 5. Vérifier l'URL d'authentification
print_status "Test 5: Récupération de l'URL d'authentification..."
AUTH_URL_RESPONSE=$(curl -s -X GET "${API_URL}/api/auth/login-url")

echo $AUTH_URL_RESPONSE | jq '.'

# 6. Déconnexion
print_status "Test 6: Déconnexion..."
LOGOUT_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/logout?refresh_token=${REFRESH_TOKEN}")

echo $LOGOUT_RESPONSE | jq '.'

print_status "Tests terminés."
