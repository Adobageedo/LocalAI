FROM nginx:1.25-alpine

# Installer les dépendances nécessaires
RUN apk add --no-cache openssl bash curl

# Créer les répertoires nécessaires
RUN mkdir -p /etc/nginx/ssl/live/chardouin.fr \
    && mkdir -p /usr/share/nginx/html/chardouin.fr \
    && mkdir -p /var/www/certbot

# Copier la configuration Nginx
COPY conf/ /etc/nginx/conf.d/

# Créer une page HTML de test
RUN echo "<html><head><title>Test SSL</title></head><body><h1>SSL Test Page</h1><p>Si vous voyez cette page, cela signifie que le serveur Nginx fonctionne correctement.</p></body></html>" > /usr/share/nginx/html/chardouin.fr/index.html

# Générer des certificats auto-signés temporaires
RUN openssl req -x509 -nodes -newkey rsa:4096 -days 365 \
    -keyout /etc/nginx/ssl/live/chardouin.fr/privkey.pem \
    -out /etc/nginx/ssl/live/chardouin.fr/fullchain.pem \
    -subj "/CN=chardouin.fr" \
    -addext "subjectAltName=DNS:chardouin.fr,DNS:www.chardouin.fr,DNS:localhost"

# Définir les permissions appropriées
RUN chmod 600 /etc/nginx/ssl/live/chardouin.fr/privkey.pem \
    && chmod 644 /etc/nginx/ssl/live/chardouin.fr/fullchain.pem

# Copier le script d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Utiliser le script d'entrée personnalisé
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
