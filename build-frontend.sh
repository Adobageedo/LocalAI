#!/bin/bash

# Script pour construire l'application frontend React pour le déploiement Docker

# Définir les variables d'environnement pour la construction
export VITE_NEXTCLOUD_URL=http://localhost:8080
export VITE_NEXTCLOUD_USERNAME=admin
export VITE_NEXTCLOUD_PASSWORD=admin_password
export VITE_KEYCLOAK_URL=http://localhost:8081
export VITE_KEYCLOAK_REALM=newsflix
export VITE_KEYCLOAK_CLIENT_ID=rag-frontend

# Se positionner dans le répertoire du frontend
cd ./rag-frontend

# Nettoyer les installations précédentes
#echo "🧹 Nettoyage des installations précédentes..."
#rm -rf node_modules
#rm -f package-lock.json

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Construire l'application
echo "🏗️ Construction de l'application..."
npm run build

# Vérifier que le build s'est bien passé
if [ -d "./dist" ]; then
  echo "✅ Build réussi ! Les fichiers sont dans le dossier './dist'"
  echo "🚀 Vous pouvez maintenant démarrer Docker avec 'docker-compose up -d'"
  # Supprime les anciens fichiers du site
  sudo rm -rf /var/www/chardouin.fr/html/*

  # Déplace les nouveaux fichiers buildés
  sudo mv ./dist/* /var/www/chardouin.fr/html/

  echo "📁 Déploiement terminé dans /var/www/chardouin.fr/html"

else
  echo "❌ Erreur lors du build. Vérifiez les logs ci-dessus."
fi
