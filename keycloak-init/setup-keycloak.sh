#!/bin/bash
# Script d'initialisation de Keycloak pour LocalAI
# Ce script configure un environnement Keycloak complet avec :
# - Démarrage de Keycloak via Docker
# - Création du realm "localai"
# - Configuration du client "localai-frontend"
# - Création d'un utilisateur de test
# - Configuration des permissions et rôles

set -e  # Arrêter le script en cas d'erreur

# Configuration
KEYCLOAK_HOST=${KEYCLOAK_HOST:-"localhost"}
KEYCLOAK_PORT=${KEYCLOAK_PORT:-"8081"}
KEYCLOAK_URL="http://${KEYCLOAK_HOST}:${KEYCLOAK_PORT}"
KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN:-"admin"}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-"admin"}
REALM_NAME=${REALM_NAME:-"localai"}
CLIENT_ID=${CLIENT_ID:-"localai-frontend"}
TEST_USER=${TEST_USER:-"testuser"}
TEST_PASSWORD=${TEST_PASSWORD:-"password"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:5173"}
MAX_AUTH_ATTEMPTS=10
TOKEN_REFRESH_INTERVAL=45  # Rafraîchir le token toutes les 45 secondes

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

wait_for_keycloak() {
    print_status "Attente du démarrage de Keycloak..."
    
    for i in $(seq 1 30); do
        if curl -s -f -o /dev/null "$KEYCLOAK_URL"; then
            print_status "Keycloak est prêt!"
            return 0
        fi
        print_warning "Keycloak n'est pas encore prêt, nouvelle tentative dans 2 secondes... ($i/30)"
        sleep 2
    done
    
    print_error "Keycloak n'est pas disponible après 60 secondes"
    return 1
}

# 1. Démarrer Keycloak s'il n'est pas déjà en cours d'exécution
start_keycloak() {
    if curl -s -f -o /dev/null "$KEYCLOAK_URL"; then
        print_status "Keycloak est déjà en cours d'exécution à $KEYCLOAK_URL"
    else
        print_status "Démarrage de Keycloak avec Docker..."
        # Vérifier si le conteneur existe déjà
        if docker ps -a --format '{{.Names}}' | grep -q "keycloak-localai"; then
            docker start keycloak-localai
        else
            docker run -d \
                --name keycloak-localai \
                -p ${KEYCLOAK_PORT}:8080 \
                -e KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN} \
                -e KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD} \
                quay.io/keycloak/keycloak:22.0.1 \
                start-dev
        fi
        
        wait_for_keycloak || exit 1
    fi
}

# 2. Obtention du token admin
get_admin_token() {
    print_status "Obtention du token admin..."
    
    ADMIN_TOKEN=""
    TOKEN_OBTAINED_TIME=$(date +%s)
    
    for i in $(seq 1 $MAX_AUTH_ATTEMPTS); do
        TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "username=${KEYCLOAK_ADMIN}" \
            -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
            -d "grant_type=password" \
            -d "client_id=admin-cli")
        
        ADMIN_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
        
        if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
            print_status "Token admin obtenu avec succès"
            return 0
        fi
        
        print_warning "Échec de l'obtention du token admin, nouvel essai dans 2 secondes... ($i/$MAX_AUTH_ATTEMPTS)"
        sleep 2
    done
    
    print_error "Impossible d'obtenir un token admin après $MAX_AUTH_ATTEMPTS tentatives."
    print_error "Réponse: $TOKEN_RESPONSE"
    return 1
}

# Fonction pour rafraîchir le token admin si nécessaire
refresh_admin_token_if_needed() {
    local CURRENT_TIME=$(date +%s)
    local TOKEN_AGE=$((CURRENT_TIME - TOKEN_OBTAINED_TIME))
    
    if [ $TOKEN_AGE -ge $TOKEN_REFRESH_INTERVAL ]; then
        print_status "Le token admin a $TOKEN_AGE secondes, rafraîchissement nécessaire..."
        get_admin_token
    else
        print_status "Le token admin a $TOKEN_AGE secondes, pas besoin de rafraîchir"
    fi
    
    # Vérification rapide que le token est toujours valide
    local TOKEN_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${KEYCLOAK_URL}/admin/realms" \
                         -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if [ "$TOKEN_CHECK" != "200" ]; then
        print_warning "Le token admin semble invalide malgré sa fraîcheur, obtention d'un nouveau token..."
        get_admin_token
    fi
}

# 3. Créer le realm "localai" s'il n'existe pas
create_realm() {
    refresh_admin_token_if_needed
    
    print_status "Vérification de l'existence du realm '$REALM_NAME'..."
    
    REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}" -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if [ "$REALM_EXISTS" == "200" ]; then
        print_status "Le realm '$REALM_NAME' existe déjà."
    else
        print_status "Création du realm '$REALM_NAME'..."
        REALM_CREATE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "realm": "'"${REALM_NAME}"'",
                "enabled": true,
                "registrationAllowed": true,
                "registrationEmailAsUsername": false,
                "editUsernameAllowed": false,
                "resetPasswordAllowed": true,
                "bruteForceProtected": true
            }')
        
        # Rafraîchir le token avant de vérifier
        refresh_admin_token_if_needed
        
        # Vérifier que le realm a bien été créé
        REALM_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}" -H "Authorization: Bearer $ADMIN_TOKEN")
        
        if [ "$REALM_CHECK" == "200" ]; then
            print_status "Realm '$REALM_NAME' créé avec succès!"
        else
            print_error "Erreur lors de la création du realm '$REALM_NAME'."
            print_error "Réponse: $REALM_CREATE_RESPONSE"
            return 1
        fi
    fi
    
    return 0
}

# 4. Créer le client "localai-frontend" s'il n'existe pas
create_client() {
    refresh_admin_token_if_needed
    
    print_status "Vérification de l'existence du client '$CLIENT_ID'..."
    print_status "URL: ${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients"
    
    # Vérifier si jq est disponible
    if command -v jq >/dev/null 2>&1; then
        print_status "Utilisation de jq pour le traitement JSON"
        CLIENT_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        
        # Si la réponse contient une erreur, afficher l'erreur
        if echo "$CLIENT_RESPONSE" | jq -e 'has("error")' >/dev/null; then
            print_error "Erreur lors de la récupération des clients: $(echo "$CLIENT_RESPONSE" | jq -r '.error')"
            print_error "Obtention d'un nouveau token..."
            get_admin_token
            CLIENT_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
        fi
        
        CLIENT_EXISTS=$(echo "$CLIENT_RESPONSE" | jq -r --arg clientId "${CLIENT_ID}" '[.[] | select(.clientId==$clientId)] | length')
    else
        print_status "jq non disponible, utilisation de grep"
        CLIENT_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        
        CLIENT_EXISTS=$(echo "$CLIENT_RESPONSE" | grep -c "\"clientId\":\"${CLIENT_ID}\"")
    fi
    print_status "CLIENT_EXISTS: $CLIENT_EXISTS"
    
    if [ "$CLIENT_EXISTS" -gt "0" ]; then
        print_status "Le client '$CLIENT_ID' existe déjà."
        
        refresh_admin_token_if_needed
        
        # Récupérer l'ID interne du client
        CLIENT_UUID=$(echo "$CLIENT_RESPONSE" | grep -o "{[^}]*\"clientId\":\"${CLIENT_ID}\"[^}]*}" \
            | grep -o '"id":"[^"]*"' \
            | cut -d'"' -f4)
        
        if [ -z "$CLIENT_UUID" ]; then
            print_warning "Impossible de trouver l'UUID du client. Réessai..."
            refresh_admin_token_if_needed
            
            CLIENT_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
                
            CLIENT_UUID=$(echo "$CLIENT_RESPONSE" | grep -o "{[^}]*\"clientId\":\"${CLIENT_ID}\"[^}]*}" \
                | grep -o '"id":"[^"]*"' \
                | cut -d'"' -f4)
                
            if [ -z "$CLIENT_UUID" ]; then
                print_error "Impossible de récupérer l'UUID du client après plusieurs tentatives."
                return 1
            fi
        fi
        
        print_status "Client UUID: $CLIENT_UUID"
        
        # Récupérer le secret client
        refresh_admin_token_if_needed
        CLIENT_SECRET_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}/client-secret" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        
        CLIENT_SECRET=$(echo $CLIENT_SECRET_RESPONSE | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
        
        if [ -z "$CLIENT_SECRET" ]; then
            print_warning "Impossible de récupérer le secret du client. Régénération du secret..."
            refresh_admin_token_if_needed
            
            # Régénérer le secret du client
            NEW_SECRET_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}/client-secret" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
            
            CLIENT_SECRET=$(echo $NEW_SECRET_RESPONSE | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
            
            if [ -z "$CLIENT_SECRET" ]; then
                print_error "Impossible de régénérer le secret du client."
                print_error "Réponse: $NEW_SECRET_RESPONSE"
                return 1
            fi
        fi
        
        print_status "Secret du client: $CLIENT_SECRET"
    else
        print_status "Création du client '$CLIENT_ID'..."
        refresh_admin_token_if_needed
        
        # Créer le client
        CLIENT_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "clientId": "'"${CLIENT_ID}"'",
                "enabled": true,
                "protocol": "openid-connect",
                "redirectUris": ["'"${FRONTEND_URL}"'/*"],
                "webOrigins": ["'"${FRONTEND_URL}"'"],
                "publicClient": false,
                "directAccessGrantsEnabled": true,
                "standardFlowEnabled": true,
                "implicitFlowEnabled": false,
                "serviceAccountsEnabled": true,
                "authorizationServicesEnabled": true
            }')
        
        # Vérifier que le client a été créé
        refresh_admin_token_if_needed
        CLIENT_CHECK=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -c "\"clientId\":\"${CLIENT_ID}\"")
        
        if [ "$CLIENT_CHECK" -gt "0" ]; then
            print_status "Client '$CLIENT_ID' créé avec succès!"
            
            # Récupérer l'ID interne du client
            CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                | grep -o "{[^}]*\"clientId\":\"${CLIENT_ID}\"[^}]*}" \
                | grep -o '"id":"[^"]*"' \
                | cut -d'"' -f4)
            
            if [ -z "$CLIENT_UUID" ]; then
                print_warning "Impossible de trouver l'UUID du client après création. Réessai..."
                sleep 2
                refresh_admin_token_if_needed
                
                CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
                    -H "Authorization: Bearer $ADMIN_TOKEN" \
                    | grep -o "{[^}]*\"clientId\":\"${CLIENT_ID}\"[^}]*}" \
                    | grep -o '"id":"[^"]*"' \
                    | cut -d'"' -f4)
                    
                if [ -z "$CLIENT_UUID" ]; then
                    print_error "Impossible de récupérer l'UUID du client après création."
                    return 1
                fi
            fi
            
            print_status "Client UUID: $CLIENT_UUID"
            
            # Récupérer le secret client
            refresh_admin_token_if_needed
            CLIENT_SECRET_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}/client-secret" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
            
            CLIENT_SECRET=$(echo $CLIENT_SECRET_RESPONSE | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
            
            if [ -z "$CLIENT_SECRET" ]; then
                print_warning "Impossible de récupérer le secret du client. Régénération du secret..."
                refresh_admin_token_if_needed
                
                # Régénérer le secret du client
                NEW_SECRET_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}/client-secret" \
                    -H "Authorization: Bearer $ADMIN_TOKEN")
                
                CLIENT_SECRET=$(echo $NEW_SECRET_RESPONSE | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
                
                if [ -z "$CLIENT_SECRET" ]; then
                    print_error "Impossible de régénérer le secret du client."
                    print_error "Réponse: $NEW_SECRET_RESPONSE"
                    return 1
                fi
            fi
            
            print_status "Secret du client: $CLIENT_SECRET"
        else
            print_error "Erreur lors de la création du client '$CLIENT_ID'."
            print_error "Réponse: $CLIENT_RESPONSE"
            return 1
        fi
    fi
    
    return 0
}

# 5. Créer un utilisateur de test s'il n'existe pas
create_test_user() {
    refresh_admin_token_if_needed
    
    print_status "Vérification de l'existence de l'utilisateur de test '$TEST_USER'..."
    
    # Vérifier si jq est disponible
    if command -v jq >/dev/null 2>&1; then
        USER_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        # Si la réponse contient une erreur, afficher l'erreur
        if echo "$USER_RESPONSE" | jq -e 'has("error")' >/dev/null 2>&1; then
            print_error "Erreur lors de la récupération des utilisateurs: $(echo "$USER_RESPONSE" | jq -r '.error')"
            print_error "Obtention d'un nouveau token..."
            get_admin_token
            USER_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
        fi
        
        USER_EXISTS=$(echo "$USER_RESPONSE" | jq -r --arg username "${TEST_USER}" '[.[] | select(.username==$username)] | length')
    else
        USER_EXISTS=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -c "\"username\":\"${TEST_USER}\"")
    fi
    
    print_status "USER_EXISTS: $USER_EXISTS"
    
    if [ "$USER_EXISTS" -gt "0" ]; then
        print_status "L'utilisateur de test '$TEST_USER' existe déjà."
    else
        print_status "Création de l'utilisateur de test '$TEST_USER'..."
        USER_CREATE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "username": "'"${TEST_USER}"'",
                "enabled": true,
                "emailVerified": true,
                "firstName": "Test",
                "lastName": "User",
                "email": "'"${TEST_USER}"'@example.com",
                "credentials": [
                    {
                        "type": "password",
                        "value": "'"${TEST_PASSWORD}"'",
                        "temporary": false
                    }
                ]
            }')
        
        # Vérifier que l'utilisateur a bien été créé
        USER_CHECK=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -c "\"username\":\"${TEST_USER}\"")
        
        if [ "$USER_CHECK" -gt "0" ]; then
            print_status "Utilisateur de test '$TEST_USER' créé avec succès!"
        else
            print_error "Erreur lors de la création de l'utilisateur de test '$TEST_USER'."
            print_error "Réponse: $USER_CREATE_RESPONSE"
            return 1
        fi
    fi
    
    return 0
}

# 6. Créer des rôles et assigner des rôles à l'utilisateur de test
create_roles() {
    refresh_admin_token_if_needed
    
    print_status "Vérification de l'existence du rôle 'user' et assignation à l'utilisateur de test..."
    
    # Créer le rôle 'user' s'il n'existe pas
    refresh_admin_token_if_needed
    
    if command -v jq >/dev/null 2>&1; then
        ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        # Si la réponse contient une erreur, afficher l'erreur
        if echo "$ROLES_RESPONSE" | jq -e 'has("error")' >/dev/null 2>&1; then
            print_error "Erreur lors de la récupération des rôles: $(echo "$ROLES_RESPONSE" | jq -r '.error')"
            print_error "Obtention d'un nouveau token..."
            get_admin_token
            ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
        fi
        
        ROLE_EXISTS=$(echo "$ROLES_RESPONSE" | jq -r --arg rolename "user" '[.[] | select(.name==$rolename)] | length')
    else
        ROLE_EXISTS=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -c "\"name\":\"user\"")
    fi
    
    print_status "ROLE_USER_EXISTS: $ROLE_EXISTS"
    
    if [ "$ROLE_EXISTS" -gt "0" ]; then
        print_status "Le rôle 'user' existe déjà."
    else
        print_status "Création du rôle 'user'..."
        ROLE_CREATE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "user",
                "description": "Utilisateur standard"
            }')
        
        if [ -n "$ROLE_CREATE_RESPONSE" ]; then
            print_error "Erreur lors de la création du rôle 'user': $ROLE_CREATE_RESPONSE"
        else
            print_status "Rôle 'user' créé avec succès!"
        fi
    fi
    
    # Créer le rôle 'admin' s'il n'existe pas
    refresh_admin_token_if_needed
    
    if command -v jq >/dev/null 2>&1; then
        ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        # Si la réponse contient une erreur, afficher l'erreur
        if echo "$ROLES_RESPONSE" | jq -e 'has("error")' >/dev/null 2>&1; then
            print_error "Erreur lors de la récupération des rôles: $(echo "$ROLES_RESPONSE" | jq -r '.error')"
            print_error "Obtention d'un nouveau token..."
            get_admin_token
            ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
        fi
        
        ROLE_EXISTS=$(echo "$ROLES_RESPONSE" | jq -r --arg rolename "admin" '[.[] | select(.name==$rolename)] | length')
    else
        ROLE_EXISTS=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -c "\"name\":\"admin\"")
    fi
    
    print_status "ROLE_ADMIN_EXISTS: $ROLE_EXISTS"
    
    if [ "$ROLE_EXISTS" -gt "0" ]; then
        print_status "Le rôle 'admin' existe déjà."
    else
        print_status "Création du rôle 'admin'..."
        ROLE_CREATE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "admin",
                "description": "Administrateur"
            }')
        
        if [ -n "$ROLE_CREATE_RESPONSE" ]; then
            print_error "Erreur lors de la création du rôle 'admin': $ROLE_CREATE_RESPONSE"
        else
            print_status "Rôle 'admin' créé avec succès!"
        fi
    fi
    
    # Récupérer l'ID de l'utilisateur de test
    refresh_admin_token_if_needed
    
    if command -v jq >/dev/null 2>&1; then
        USERS_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        # Vérifier s'il y a une erreur
        if echo "$USERS_RESPONSE" | jq -e 'has("error")' >/dev/null 2>&1; then
            print_error "Erreur lors de la récupération des utilisateurs: $(echo "$USERS_RESPONSE" | jq -r '.error')"
            print_error "Obtention d'un nouveau token..."
            get_admin_token
            USERS_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
        fi
        
        USER_ID=$(echo "$USERS_RESPONSE" | jq -r --arg username "${TEST_USER}" '.[] | select(.username==$username) | .id')
    else
        USER_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -o "{\"id\":\"[^\"]*\",\"createdTimestamp\":[0-9]*,\"username\":\"${TEST_USER}\"" \
            | grep -o "\"id\":\"[^\"]*\"" \
            | grep -o "[^\"]*$")
    fi
    
    print_status "USER_ID: $USER_ID"
    
    # Attribuer le rôle 'user' à l'utilisateur de test
    refresh_admin_token_if_needed
    print_status "Attribution du rôle 'user' à l'utilisateur de test..."
    
    # Récupérer l'ID du rôle 'user'
    if command -v jq >/dev/null 2>&1; then
        ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        USER_ROLE_ID=$(echo "$ROLES_RESPONSE" | jq -r --arg rolename "user" '.[] | select(.name==$rolename) | .id')
    else
        USER_ROLE_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -o "{\"id\":\"[^\"]*\",\"name\":\"user\"" \
            | grep -o "\"id\":\"[^\"]*\"" \
            | grep -o "[^\"]*$")
    fi
    
    print_status "USER_ROLE_ID: $USER_ROLE_ID"
    
    # Vérifier que USER_ID et USER_ROLE_ID sont valides
    if [ -z "$USER_ID" ] || [ -z "$USER_ROLE_ID" ]; then
        print_error "Impossible d'attribuer le rôle 'user': ID utilisateur ou ID rôle manquant"
    else
        ASSIGN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${USER_ID}/role-mappings/realm" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '[{
                "id": "'"${USER_ROLE_ID}"'",
                "name": "user"
            }]')
            
        if [ -n "$ASSIGN_RESPONSE" ]; then
            print_error "Erreur lors de l'attribution du rôle 'user': $ASSIGN_RESPONSE"
        else
            print_status "Rôle 'user' attribué avec succès!"
        fi
    fi
    
    # Attribuer le rôle 'admin' à l'utilisateur de test
    refresh_admin_token_if_needed
    print_status "Attribution du rôle 'admin' à l'utilisateur de test..."
    
    # Récupérer l'ID du rôle 'admin'
    if command -v jq >/dev/null 2>&1; then
        ROLES_RESPONSE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
            
        ADMIN_ROLE_ID=$(echo "$ROLES_RESPONSE" | jq -r --arg rolename "admin" '.[] | select(.name==$rolename) | .id')
    else
        ADMIN_ROLE_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            | grep -o "{\"id\":\"[^\"]*\",\"name\":\"admin\"" \
            | grep -o "\"id\":\"[^\"]*\"" \
            | grep -o "[^\"]*$")
    fi
    
    print_status "ADMIN_ROLE_ID: $ADMIN_ROLE_ID"
    
    # Vérifier que USER_ID et ADMIN_ROLE_ID sont valides
    if [ -z "$USER_ID" ] || [ -z "$ADMIN_ROLE_ID" ]; then
        print_error "Impossible d'attribuer le rôle 'admin': ID utilisateur ou ID rôle manquant"
    else
        ASSIGN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${USER_ID}/role-mappings/realm" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '[{
                "id": "'"${ADMIN_ROLE_ID}"'",
                "name": "admin"
            }]')
            
        if [ -n "$ASSIGN_RESPONSE" ]; then
            print_error "Erreur lors de l'attribution du rôle 'admin': $ASSIGN_RESPONSE"
        else
            print_status "Rôle 'admin' attribué avec succès!"
        fi
    fi
    
    return 0
}

# Exécution de toutes les étapes
main() {
    print_status "Démarrage de la configuration de Keycloak pour LocalAI..."
    
    start_keycloak
    get_admin_token
    create_realm
    create_client
    create_test_user
    create_roles
    
    # Afficher un résumé de la configuration
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║ CONFIGURATION KEYCLOAK TERMINÉE AVEC SUCCÈS                   ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║                                                               ║"
    echo "║  URL Keycloak: ${KEYCLOAK_URL}                             ║"
    echo "║  Realm: ${REALM_NAME}                                             ║"
    echo "║  Client ID: ${CLIENT_ID}                                  ║"
    echo "║  Frontend URL: ${FRONTEND_URL}                              ║"
    echo "║                                                               ║"
    echo "║  Utilisateur de test: ${TEST_USER}                                   ║"
    echo "║  Mot de passe: ${TEST_PASSWORD}                                     ║"
    echo "║  Rôles: user, admin                                           ║"
    echo "║                                                               ║"
    echo "║  Client Secret: Sauvegardé dans .env.keycloak                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Pour ajouter le client secret à votre backend :"
    echo "source .env.keycloak"
    echo ""
    echo "URL de connexion à l'interface d'administration Keycloak :"
    echo "${KEYCLOAK_URL}/admin/ (admin / ${KEYCLOAK_ADMIN_PASSWORD})"
    echo ""
    
    return 0
}

# Exécuter le script
main
