#!/bin/bash

# Script pour configurer et tester le serveur Nginx statique
# Auteur: Cascade
# Date: 2025-05-27

echo "Configuration du serveur Nginx statique pour chardouin.fr"
echo "========================================================"

# 1. Création des répertoires nécessaires
echo "Création des répertoires..."
sudo mkdir -p /var/www/chardouin.fr/html
sudo chmod -R 755 /var/www/chardouin.fr

# 2. Création d'une page HTML de test
echo "Création d'une page HTML de test..."
cat > /tmp/index.html << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chardouin.fr - Test du site statique</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
        }
        header {
            background-color: #0078d7;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .content {
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        footer {
            margin-top: 20px;
            text-align: center;
            font-size: 0.8em;
            color: #666;
        }
    </style>
</head>
<body>
    <header>
        <h1>Chardouin.fr</h1>
        <p>Site web statique servi par Nginx</p>
    </header>
    
    <div class="content">
        <h2>Test réussi !</h2>
        <p>Si vous voyez cette page, votre serveur Nginx est correctement configuré et fonctionne parfaitement.</p>
        <p>Cette page est servie depuis <code>/var/www/chardouin.fr/html/index.html</code>.</p>
        
        <h3>Votre infrastructure :</h3>
        <ul>
            <li><strong>Nginx</strong> - Serveur web et proxy inverse</li>
            <li><strong>Qdrant</strong> - Base de données vectorielle</li>
            <li><strong>API RAG</strong> - Accessible via /api/</li>
            <li><strong>Nextcloud</strong> - Accessible via /nextcloud/</li>
        </ul>
        
        <p>Date et heure du test : <span id="datetime"></span></p>
        <script>
            document.getElementById("datetime").textContent = new Date().toLocaleString();
        </script>
    </div>
    
    <footer>
        <p>&copy; 2025 Chardouin.fr - Tous droits réservés</p>
    </footer>
</body>
</html>
EOF

sudo cp /tmp/index.html /var/www/chardouin.fr/html/
sudo chown -R $(whoami):$(whoami) /var/www/chardouin.fr/html/
sudo chmod 644 /var/www/chardouin.fr/html/index.html

echo "Page HTML de test créée avec succès!"

# 3. Vérification des répertoires pour Certbot et SSL
echo "Création des répertoires pour Certbot et SSL..."
mkdir -p ./certbot/www
mkdir -p ./nginx/ssl
mkdir -p ./nginx/logs

# 4. Démarrage des services Docker
echo "Démarrage des services Docker..."
cd /Users/edoardo/Documents/LocalAI
docker-compose down
docker-compose up -d

echo ""
echo "========================================================"
echo "Configuration terminée !"
echo ""
echo "Pour tester votre serveur :"
echo "1. Ajoutez l'entrée suivante à votre fichier /etc/hosts :"
echo "   127.0.0.1 chardouin.fr www.chardouin.fr"
echo ""
echo "2. Ouvrez votre navigateur et accédez à :"
echo "   http://chardouin.fr"
echo ""
echo "3. Vos API sont accessibles via :"
echo "   http://chardouin.fr/api/"
echo ""
echo "4. Nextcloud est accessible via :"
echo "   http://chardouin.fr/nextcloud/"
echo "========================================================"
