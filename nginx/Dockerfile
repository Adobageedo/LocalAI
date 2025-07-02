FROM nginx:alpine

# Install required packages
RUN apk add --no-cache openssl bash curl

# Create directories for SSL certificates and Nginx configuration
RUN mkdir -p /etc/nginx/ssl/live/chardouin.fr \
    && mkdir -p /var/www/certbot \
    && mkdir -p /var/log/nginx \
    && mkdir -p /usr/share/nginx/html/chardouin.fr

# Copy Nginx configuration
COPY conf/default.conf /etc/nginx/conf.d/default.conf

# Create a sample HTML page
RUN echo '<!DOCTYPE html>\n\
<html lang="fr">\n\
<head>\n\
    <meta charset="UTF-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
    <title>Chardouin.fr - Test du site statique</title>\n\
    <style>\n\
        body {\n\
            font-family: Arial, sans-serif;\n\
            line-height: 1.6;\n\
            margin: 0;\n\
            padding: 20px;\n\
            color: #333;\n\
            max-width: 800px;\n\
            margin: 0 auto;\n\
        }\n\
        header {\n\
            background-color: #0078d7;\n\
            color: white;\n\
            padding: 20px;\n\
            text-align: center;\n\
            border-radius: 5px;\n\
            margin-bottom: 20px;\n\
        }\n\
        .content {\n\
            padding: 20px;\n\
            background-color: #f5f5f5;\n\
            border-radius: 5px;\n\
        }\n\
        .secure-badge {\n\
            background-color: #2ecc71;\n\
            color: white;\n\
            padding: 5px 10px;\n\
            border-radius: 3px;\n\
            font-weight: bold;\n\
            display: inline-block;\n\
            margin-top: 10px;\n\
        }\n\
        footer {\n\
            margin-top: 20px;\n\
            text-align: center;\n\
            font-size: 0.8em;\n\
            color: #666;\n\
        }\n\
    </style>\n\
</head>\n\
<body>\n\
    <header>\n\
        <h1>Chardouin.fr</h1>\n\
        <p>Site web statique servi par Nginx avec HTTPS</p>\n\
        <div class="secure-badge">🔒 Connexion sécurisée</div>\n\
    </header>\n\
    \n\
    <div class="content">\n\
        <h2>Test réussi !</h2>\n\
        <p>Si vous voyez cette page, votre serveur Nginx est correctement configuré et fonctionne parfaitement avec HTTPS.</p>\n\
        <p>Cette page est servie depuis <code>/usr/share/nginx/html/chardouin.fr/index.html</code>.</p>\n\
        \n\
        <h3>Votre infrastructure :</h3>\n\
        <ul>\n\
            <li><strong>Nginx</strong> - Serveur web et proxy inverse</li>\n\
            <li><strong>Qdrant</strong> - Base de données vectorielle</li>\n\
            <li><strong>API RAG</strong> - Accessible via /api/</li>\n\
            <li><strong>Backend</strong> - API LocalAI</li>\n\
        </ul>\n\
        \n\
        <p>Date et heure du test : <span id="datetime"></span></p>\n\
        <script>\n\
            document.getElementById("datetime").textContent = new Date().toLocaleString();\n\
        </script>\n\
    </div>\n\
    \n\
    <footer>\n\
        <p>&copy; 2025 Chardouin.fr - Tous droits réservés</p>\n\
    </footer>\n\
</body>\n\
</html>' > /usr/share/nginx/html/chardouin.fr/index.html

# Generate self-signed SSL certificates for initial setup
RUN openssl genrsa -out /etc/nginx/ssl/live/chardouin.fr/privkey.pem 2048 \
    && openssl req -new -x509 -key /etc/nginx/ssl/live/chardouin.fr/privkey.pem \
       -out /etc/nginx/ssl/live/chardouin.fr/fullchain.pem \
       -days 3650 -subj "/CN=chardouin.fr" \
       -addext "subjectAltName=DNS:chardouin.fr,DNS:www.chardouin.fr,DNS:localhost"

# Set proper permissions
RUN chmod 644 /usr/share/nginx/html/chardouin.fr/index.html \
    && chmod 600 /etc/nginx/ssl/live/chardouin.fr/privkey.pem \
    && chmod 644 /etc/nginx/ssl/live/chardouin.fr/fullchain.pem

# Create a script to reload Nginx when certificates are renewed
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
