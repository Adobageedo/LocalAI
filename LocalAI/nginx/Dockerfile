FROM nginx:alpine

# Installation des dépendances nécessaires
RUN apk add --no-cache openssl bash

# Création des répertoires nécessaires
RUN mkdir -p /usr/share/nginx/html/chardouin.fr \
    && mkdir -p /etc/nginx/ssl/live/chardouin.fr \
    && mkdir -p /var/www/certbot

# Copie de la configuration Nginx
COPY ./conf/default.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques (ils seront montés en volume, mais on crée un fichier de base)
COPY ./html/index.html /usr/share/nginx/html/chardouin.fr/index.html

# Génération des certificats SSL auto-signés (uniquement pour le développement)
RUN openssl genrsa -out /etc/nginx/ssl/live/chardouin.fr/privkey.pem 2048 \
    && openssl req -new -x509 -key /etc/nginx/ssl/live/chardouin.fr/privkey.pem \
        -out /etc/nginx/ssl/live/chardouin.fr/fullchain.pem \
        -days 3650 -subj "/CN=chardouin.fr" \
        -addext "subjectAltName=DNS:chardouin.fr,DNS:www.chardouin.fr,DNS:localhost"

# Création des répertoires de logs
RUN mkdir -p /var/log/nginx \
    && touch /var/log/nginx/chardouin.http.access.log \
    && touch /var/log/nginx/chardouin.http.error.log \
    && touch /var/log/nginx/chardouin.https.access.log \
    && touch /var/log/nginx/chardouin.https.error.log

# Définition des permissions
RUN chmod -R 755 /usr/share/nginx/html \
    && chmod -R 600 /etc/nginx/ssl/live/chardouin.fr \
    && chmod 644 /usr/share/nginx/html/chardouin.fr/index.html

# Exposition des ports
EXPOSE 80 443

# Commande pour démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
