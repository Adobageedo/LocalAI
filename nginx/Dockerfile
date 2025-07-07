FROM nginx:1.25-alpine

# Installer les dépendances nécessaires
RUN apk add --no-cache openssl bash curl

# Créer les répertoires nécessaires
RUN mkdir -p /etc/nginx/ssl \
    && mkdir -p /var/www/chardouin.fr/html \
    && mkdir -p /var/www/hardouinosteopathe.fr/html

# Copier la configuration Nginx
COPY conf/ /etc/nginx/conf.d/

# Créer des pages HTML de test
RUN echo "<html><head><title>Chardouin.fr</title></head><body><h1>Chardouin.fr Test Page</h1><p>If you see this page, Nginx is working correctly for chardouin.fr.</p></body></html>" > /var/www/chardouin.fr/html/index.html \
    && echo "<html><head><title>Hardouin Osteopathe</title></head><body><h1>Hardouin Osteopathe Test Page</h1><p>If you see this page, Nginx is working correctly for hardouinosteopathe.fr.</p></body></html>" > /var/www/hardouinosteopathe.fr/html/index.html

# Copier le script d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Utiliser le script d'entrée personnalisé
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
