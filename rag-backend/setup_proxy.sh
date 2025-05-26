#!/bin/bash

echo "Choose your setup:"
echo "1) Linux (Ubuntu/Debian, NGINX + Let's Encrypt)"
echo "2) macOS (Homebrew NGINX + mkcert for local HTTPS)"
read -p "Enter 1 or 2: " SETUP_CHOICE

if [ "$SETUP_CHOICE" = "1" ]; then
    # ===== Linux Setup =====
    # Utilisation d'une IP publique pour le backend
    BACKEND_IP="127.0.0.1"
    BACKEND_PORT="8000"
    PUBLIC_IP="82.66.131.108" # IP publique du serveur
    EMAIL="you@example.com" # Remplace par ton email

    sudo apt update
    sudo apt install -y nginx certbot python3-certbot-nginx

    NGINX_CONF="/etc/nginx/sites-available/$PUBLIC_IP-ssl"
    sudo tee $NGINX_CONF > /dev/null <<EOF
# Attention : Let's Encrypt ne fournit pas de certificat SSL valide pour une IP publique, seulement pour un nom de domaine !
# Si tu as un nom de domaine, utilise-le ici à la place de l'IP.

server {
    listen 8000 ssl;
    server_name $PUBLIC_IP;

    ssl_certificate /etc/letsencrypt/live/$PUBLIC_IP/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PUBLIC_IP/privkey.pem;

    location / {
        proxy_pass http://$BACKEND_IP:$BACKEND_PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "\n==> IMPORTANT :\nSi tu utilises une IP publique, Let's Encrypt ne pourra pas générer de certificat valide. Préfère un nom de domaine si possible !\n"
    echo "Pour générer un certificat auto-signé temporaire (pour test) :"
    echo "sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/backend-selfsigned.key -out /etc/ssl/certs/backend-selfsigned.crt"
    echo "Puis modifie la config nginx pour pointer sur ces fichiers."
    echo "\nSi tu utilises un nom de domaine, adapte PUBLIC_IP par le domaine et relance le script."

elif [ "$SETUP_CHOICE" = "2" ]; then
    # ===== macOS Setup =====
    echo "This will set up NGINX via Homebrew and mkcert for local HTTPS."
    echo "You need Homebrew installed: https://brew.sh/"
    read -p "Continue? (y/n): " CONTINUE_MAC
    if [ "$CONTINUE_MAC" != "y" ]; then
        echo "Aborted."
        exit 1
    fi

    brew install nginx mkcert
    mkcert -install
    # Génère un certificat pour l'IP publique ou locale
    mkcert 82.66.131.108 localhost 127.0.0.1

    # Création du dossier de config nginx si besoin
    mkdir -p /usr/local/etc/nginx/servers/
    NGINX_CONF="/usr/local/etc/nginx/servers/82.66.131.108-ssl.conf"
    cat > $NGINX_CONF <<EOF
# Attention : Les navigateurs n'acceptent pas toujours les certificats sur une IP publique, même générés par mkcert.
# Préfère un nom de domaine si possible.

server {
    listen 8000 ssl;
    server_name 82.66.131.108;

    ssl_certificate     $(pwd)/82.66.131.108+3.pem;
    ssl_certificate_key $(pwd)/82.66.131.108+3-key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    echo "Include $NGINX_CONF in your nginx.conf, then run:"
    echo "brew services restart nginx"
    echo "Access your backend via https://82.66.131.108:8000"
    echo "Si besoin, ajoute dans /etc/hosts : 127.0.0.1 82.66.131.108"
    echo "⚠️ Pour une compatibilité maximale, utilise plutôt un nom de domaine."

else
    echo "Invalid choice."
    exit 1
fi