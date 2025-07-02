#!/bin/bash

# Script pour initialiser les certificats Let's Encrypt
# Basé sur https://github.com/wmnnd/nginx-certbot

# Vérifier si le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then
  echo "Ce script doit être exécuté en tant que root (sudo)."
  exit 1
fi

# Paramètres par défaut
domains=(chardouin.fr www.chardouin.fr)
rsa_key_size=4096
data_path="./nginx/ssl"
email="admin@chardouin.fr" # Adresse email pour les notifications Let's Encrypt
staging=0 # Mettre à 1 pour tester avec le serveur staging de Let's Encrypt

# Demander les informations à l'utilisateur
read -p "Entrez votre domaine principal (par défaut: chardouin.fr): " input_domain
domain=${input_domain:-${domains[0]}}
domains=($domain www.$domain)

read -p "Entrez votre email pour Let's Encrypt (par défaut: admin@$domain): " input_email
email=${input_email:-"admin@$domain"}

read -p "Utiliser le serveur de staging de Let's Encrypt? (0: Non, 1: Oui) [0]: " input_staging
staging=${input_staging:-$staging}

echo "### Création des répertoires pour $domain ###"

# Créer les répertoires requis
mkdir -p "$data_path/live/$domain"
mkdir -p "./certbot/www"
mkdir -p "./certbot/conf/live/$domain"

# Générer des certificats auto-signés si nécessaire
if [ ! -f "$data_path/live/$domain/fullchain.pem" ] || [ ! -f "$data_path/live/$domain/privkey.pem" ]; then
  echo "### Génération de certificats auto-signés temporaires ###"
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
    -keyout "$data_path/live/$domain/privkey.pem" \
    -out "$data_path/live/$domain/fullchain.pem" \
    -subj "/CN=$domain" \
    -addext "subjectAltName=DNS:$domain,DNS:www.$domain,DNS:localhost"
  
  # Définir les permissions appropriées
  chmod 600 "$data_path/live/$domain/privkey.pem"
  chmod 644 "$data_path/live/$domain/fullchain.pem"
  
  echo "Certificats auto-signés générés avec succès."
fi

# S'assurer que Nginx utilise les certificats auto-signés pour démarrer
echo "### Démarrage de Nginx avec les certificats auto-signés ###"
docker compose up -d nginx
echo "Attente de 5 secondes pour que Nginx démarre..."
sleep 5

echo "### Nettoyage des anciens certificats Let's Encrypt (s'ils existent) ###"
docker compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$domain* && \
  rm -rf /etc/letsencrypt/archive/$domain* && \
  rm -rf /etc/letsencrypt/renewal/$domain*.conf" certbot

echo "### Demande du certificat Let's Encrypt ###"
# Sélectionner le bon paramètre en fonction du mode staging
staging_arg=""
if [ $staging -eq 1 ]; then
  staging_arg="--staging"
fi

# Joindre les domaines en une chaîne séparée par -d
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Obtenir le certificat
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    $domain_args" certbot

# Trouver le répertoire de certificat réel (peut être avec un suffixe comme -0001)
echo "### Recherche des certificats Let's Encrypt générés ###"
cert_path=$(docker compose exec certbot find /etc/letsencrypt/live -name "fullchain.pem" | grep "$domain" | head -n 1 | xargs dirname 2>/dev/null)

if [ -n "$cert_path" ]; then
  echo "Certificats trouvés dans: $cert_path"
  
  # Sauvegarder les certificats auto-signés
  echo "### Sauvegarde des certificats auto-signés ###"
  cp "$data_path/live/$domain/fullchain.pem" "$data_path/live/$domain/fullchain.pem.self-signed" 2>/dev/null || true
  cp "$data_path/live/$domain/privkey.pem" "$data_path/live/$domain/privkey.pem.self-signed" 2>/dev/null || true
  
  # Copier les certificats Let's Encrypt vers le répertoire Nginx
  echo "### Copie des certificats Let's Encrypt vers Nginx ###"
  docker compose exec certbot cp "$cert_path/fullchain.pem" "/etc/nginx/ssl/live/$domain/fullchain.pem"
  docker compose exec certbot cp "$cert_path/privkey.pem" "/etc/nginx/ssl/live/$domain/privkey.pem"
  
  # Définir les permissions appropriées
  docker compose exec certbot chmod 644 "/etc/nginx/ssl/live/$domain/fullchain.pem"
  docker compose exec certbot chmod 600 "/etc/nginx/ssl/live/$domain/privkey.pem"
  
  echo "### Redémarrage de Nginx avec les certificats Let's Encrypt ###"
  docker compose exec nginx nginx -s reload
  
  echo "### Configuration terminée! ###"
  echo "Les certificats Let's Encrypt ont été générés pour: ${domains[*]}"
  echo "Ils seront automatiquement renouvelés tous les 90 jours."
  echo "Vous pouvez maintenant accéder à votre site via HTTPS: https://$domain"
else
  echo "### ERREUR: Les certificats Let's Encrypt n'ont pas été trouvés ###"
  echo "Nginx continue d'utiliser les certificats auto-signés."
  echo "Vérifiez les journaux de Certbot pour plus d'informations:"
  docker compose logs certbot
fi
