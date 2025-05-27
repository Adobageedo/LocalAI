#!/bin/bash

# Script pour configurer le serveur Nginx statique avec HTTPS
# Auteur: Cascade
# Date: 2025-05-27

echo "Configuration du serveur Nginx statique pour chardouin.fr avec HTTPS"
echo "=================================================================="

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
        .secure-badge {
            background-color: #2ecc71;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
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
        <p>Site web statique servi par Nginx avec HTTPS</p>
        <div class="secure-badge">🔒 Connexion sécurisée</div>
    </header>
    
    <div class="content">
        <h2>Test réussi !</h2>
        <p>Si vous voyez cette page, votre serveur Nginx est correctement configuré et fonctionne parfaitement avec HTTPS.</p>
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

# 3. Création des répertoires pour SSL et Certbot
echo "Création des répertoires pour SSL et Certbot..."
mkdir -p ./nginx/ssl/live/chardouin.fr
mkdir -p ./certbot/www
mkdir -p ./nginx/logs

# 4. Génération des certificats SSL auto-signés
echo "Génération de certificats SSL auto-signés..."
openssl genrsa -out ./nginx/ssl/live/chardouin.fr/privkey.pem 2048
openssl req -new -x509 -key ./nginx/ssl/live/chardouin.fr/privkey.pem \
    -out ./nginx/ssl/live/chardouin.fr/fullchain.pem \
    -days 3650 -subj "/CN=chardouin.fr" \
    -addext "subjectAltName=DNS:chardouin.fr,DNS:www.chardouin.fr,DNS:localhost"

echo "Certificats SSL générés avec succès!"

# 5. Configuration Nginx avec HTTPS
echo "Configuration de Nginx avec HTTPS..."
cat > ./nginx/conf/default.conf << 'EOF'
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name chardouin.fr www.chardouin.fr localhost;
    
    # Logs pour le serveur HTTP
    access_log /var/log/nginx/chardouin.http.access.log;
    error_log /var/log/nginx/chardouin.http.error.log;
    
    # Redirection vers HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Point de challenge pour Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl;
    server_name chardouin.fr www.chardouin.fr localhost;
    
    # Logs pour le serveur HTTPS
    access_log /var/log/nginx/chardouin.https.access.log;
    error_log /var/log/nginx/chardouin.https.error.log;
    
    # Configuration SSL avec certificats auto-signés
    ssl_certificate /etc/nginx/ssl/live/chardouin.fr/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/chardouin.fr/privkey.pem;
    
    # Paramètres SSL recommandés
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # HSTS (15768000 secondes = 6 mois)
    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;
    
    # Site Web Statique - chardouin.fr
    location / {
        root /usr/share/nginx/html/chardouin.fr;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # API RAG Backend - /api/
    location /api/ {
        proxy_pass http://rag-backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Nextcloud - /nextcloud/
    location /nextcloud/ {
        proxy_pass http://nextcloud:80/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Paramètres pour les uploads volumineux
        client_max_body_size 512M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Rediriger les erreurs 404 vers la page d'accueil
    error_page 404 /index.html;
    location = /index.html {
        root /usr/share/nginx/html/chardouin.fr;
    }
}
EOF

# 6. Démarrage des services Docker
echo "Démarrage des services Docker..."
cd /Users/edoardo/Documents/LocalAI
docker-compose down
docker-compose up -d

echo ""
echo "=================================================================="
echo "Configuration terminée !"
echo ""
echo "Pour tester votre serveur :"
echo "1. Ajoutez l'entrée suivante à votre fichier /etc/hosts :"
echo "   127.0.0.1 chardouin.fr www.chardouin.fr"
echo ""
echo "2. Ouvrez votre navigateur et accédez à :"
echo "   https://chardouin.fr"
echo ""
echo "3. IMPORTANT : Vous verrez un avertissement de sécurité dans votre"
echo "   navigateur car le certificat est auto-signé. Cliquez sur"
echo "   'Avancé' puis 'Continuer vers chardouin.fr (non sécurisé)'."
echo ""
echo "4. Vos API sont accessibles via :"
echo "   https://chardouin.fr/api/"
echo ""
echo "5. Nextcloud est accessible via :"
echo "   https://chardouin.fr/nextcloud/"
echo "=================================================================="
