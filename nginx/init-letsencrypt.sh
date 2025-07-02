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
data_path="./ssl"
email="edoardogenissel@gmail.com" # Adresse email pour les notifications Let's Encrypt
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
mkdir -p "$data_path/conf/live/$domain"
mkdir -p "../certbot/www"

echo "### Suppression du certificat temporaire ###"
docker-compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$domain && \
  rm -rf /etc/letsencrypt/archive/$domain && \
  rm -rf /etc/letsencrypt/renewal/$domain.conf" certbot

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
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    $domain_args" certbot

echo "### Redémarrage de Nginx ###"
docker-compose exec nginx nginx -s reload

echo "### Configuration terminée! ###"
echo "Les certificats Let's Encrypt ont été générés pour: ${domains[*]}"
echo "Ils seront automatiquement renouvelés tous les 90 jours."
echo "Vous pouvez maintenant accéder à votre site via HTTPS: https://$domain"
