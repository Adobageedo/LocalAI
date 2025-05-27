#!/bin/bash

# Script pour configurer Nginx avec certificats Let's Encrypt
# Auteur: Cascade
# Date: 2025-05-27

# Vérifier si le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then
  echo "Ce script doit être exécuté en tant que root (sudo)."
  exit 1
fi

# Demander le domaine principal
read -p "Entrez votre domaine principal (ex: chardouin.fr): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "Domaine non spécifié. Utilisation de la valeur par défaut: chardouin.fr"
  DOMAIN="chardouin.fr"
fi

# Demander l'email pour Let's Encrypt
read -p "Entrez votre email pour Let's Encrypt (pour les notifications): " EMAIL
if [ -z "$EMAIL" ]; then
  echo "Email non spécifié. Utilisation de la valeur par défaut: admin@${DOMAIN}"
  EMAIL="admin@${DOMAIN}"
fi

# Ajouter www. en sous-domaine
DOMAINS="${DOMAIN},www.${DOMAIN}"

echo "Configuration de Nginx avec Let's Encrypt pour ${DOMAIN} et www.${DOMAIN}"
echo "=================================================================="

# 1. Création des répertoires nécessaires
echo "Création des répertoires..."
mkdir -p /var/www/${DOMAIN}/html
chmod -R 755 /var/www/${DOMAIN}

# 2. Création d'une page HTML de test
echo "Création d'une page HTML de test..."
cat > /tmp/index.html << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${DOMAIN} - Site sécurisé avec Let's Encrypt</title>
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
            background-color: #2ecc71;
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
            background-color: #27ae60;
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
        <h1>${DOMAIN}</h1>
        <p>Site web sécurisé par Let's Encrypt</p>
        <div class="secure-badge">🔒 Certificat SSL vérifié</div>
    </header>
    
    <div class="content">
        <h2>Félicitations !</h2>
        <p>Si vous voyez cette page, votre serveur Nginx est correctement configuré avec HTTPS via Let's Encrypt.</p>
        <p>Cette page est servie depuis <code>/var/www/${DOMAIN}/html/index.html</code>.</p>
        
        <h3>Votre infrastructure :</h3>
        <ul>
            <li><strong>Nginx</strong> - Serveur web et proxy inverse avec HTTPS</li>
            <li><strong>Let's Encrypt</strong> - Certificats SSL gratuits et automatiquement renouvelés</li>
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
        <p>&copy; 2025 ${DOMAIN} - Tous droits réservés</p>
    </footer>
</body>
</html>
EOF

cp /tmp/index.html /var/www/${DOMAIN}/html/
chown -R $(id -u):$(id -g) /var/www/${DOMAIN}/html/
chmod 644 /var/www/${DOMAIN}/html/index.html

echo "Page HTML de test créée avec succès!"

# 3. Création des répertoires Docker
echo "Création des répertoires pour Certbot..."
mkdir -p ./certbot/www
mkdir -p ./nginx/logs

# 4. Configuration Nginx initiale pour Let's Encrypt
echo "Configuration de Nginx pour validation Let's Encrypt..."
cat > ./nginx/conf/default.conf << EOF
# Configuration initiale pour validation Let's Encrypt
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Logs
    access_log /var/log/nginx/http.access.log;
    error_log /var/log/nginx/http.error.log;
    
    # Point de challenge pour Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Site Web Statique temporaire
    location / {
        root /usr/share/nginx/html/${DOMAIN};
        index index.html index.htm;
    }
}
EOF

# 5. Démarrage initial de Nginx pour validation Let's Encrypt
echo "Démarrage de Nginx pour validation Let's Encrypt..."
cd /Users/edoardo/Documents/LocalAI
docker-compose down
docker-compose up -d nginx

# 6. Attendre que Nginx soit prêt
echo "Attente du démarrage de Nginx..."
sleep 5

# 7. Obtention des certificats Let's Encrypt
echo "Obtention des certificats Let's Encrypt avec Certbot..."
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot \
    --email ${EMAIL} --agree-tos --no-eff-email \
    --force-renewal -d ${DOMAIN} -d www.${DOMAIN}

# 8. Vérifier si les certificats ont été générés
if [ ! -f "./nginx/ssl/live/${DOMAIN}/fullchain.pem" ]; then
    echo "Erreur: Les certificats n'ont pas été générés correctement."
    echo "Vérifiez que votre domaine pointe vers ce serveur et qu'il est accessible sur Internet."
    exit 1
fi

# 9. Configuration Nginx avec HTTPS
echo "Configuration de Nginx avec HTTPS..."
cat > ./nginx/conf/default.conf << EOF
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Logs
    access_log /var/log/nginx/http.access.log;
    error_log /var/log/nginx/http.error.log;
    
    # Point de challenge pour Certbot (renouvellement des certificats)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirection vers HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Logs
    access_log /var/log/nginx/https.access.log;
    error_log /var/log/nginx/https.error.log;
    
    # Certificats Let's Encrypt
    ssl_certificate /etc/nginx/ssl/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/${DOMAIN}/privkey.pem;
    
    # Paramètres SSL recommandés
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # HSTS (15768000 secondes = 6 mois)
    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;
    
    # Site Web Statique
    location / {
        root /usr/share/nginx/html/${DOMAIN};
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API RAG Backend - /api/
    location /api/ {
        proxy_pass http://rag-backend:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Nextcloud - /nextcloud/
    location /nextcloud/ {
        proxy_pass http://nextcloud:80/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Paramètres pour les uploads volumineux
        client_max_body_size 512M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Rediriger les erreurs 404 vers la page d'accueil
    error_page 404 /index.html;
    location = /index.html {
        root /usr/share/nginx/html/${DOMAIN};
    }
}
EOF

# 10. Redémarrage des services Docker
echo "Redémarrage des services Docker..."
docker-compose up -d

# 11. Configuration du renouvellement automatique des certificats
echo "Configuration du renouvellement automatique des certificats..."
cat > ./renew_certs.sh << 'EOF'
#!/bin/bash
# Ce script renouvelle les certificats Let's Encrypt et redémarre Nginx

# Chemin du projet
PROJECT_DIR="/Users/edoardo/Documents/LocalAI"
cd $PROJECT_DIR

# Renouvellement des certificats
docker-compose run --rm certbot renew

# Redémarrage de Nginx pour prendre en compte les nouveaux certificats
docker-compose restart nginx

echo "Certificats renouvelés avec succès : $(date)"
EOF

chmod +x ./renew_certs.sh

# Ajout d'une tâche cron pour le renouvellement (tous les mois)
CRON_JOB="0 0 1 * * /Users/edoardo/Documents/LocalAI/renew_certs.sh >> /Users/edoardo/Documents/LocalAI/certbot-renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "renew_certs.sh"; echo "$CRON_JOB") | crontab -

echo ""
echo "=================================================================="
echo "Configuration avec Let's Encrypt terminée !"
echo ""
echo "Votre site est maintenant accessible via :"
echo "- https://${DOMAIN}"
echo "- https://www.${DOMAIN}"
echo ""
echo "Votre API est accessible via :"
echo "- https://${DOMAIN}/api/"
echo ""
echo "Nextcloud est accessible via :"
echo "- https://${DOMAIN}/nextcloud/"
echo ""
echo "Les certificats Let's Encrypt seront automatiquement renouvelés chaque mois."
echo "=================================================================="
