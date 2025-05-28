#!/bin/bash

echo "Démarrage de Keycloak..."
docker-compose up -d

echo "Keycloak est accessible à l'adresse: http://localhost:8080"
echo "Nom d'utilisateur admin: admin"
echo "Mot de passe admin: admin"

echo "Instructions de configuration:"
echo "1. Accédez à l'interface d'administration: http://localhost:8080/admin"
echo "2. Connectez-vous avec les identifiants admin"
echo "3. Créez un nouveau realm (par exemple: 'newsflix')"
echo "4. Créez un nouveau client pour votre application frontend"
echo "   - Client ID: rag-frontend"
echo "   - Client Protocol: openid-connect"
echo "   - Access Type: public"
echo "   - Valid Redirect URIs: http://localhost:5173/*"
echo "   - Web Origins: +"
echo "5. Configurez les utilisateurs et les rôles selon vos besoins"
