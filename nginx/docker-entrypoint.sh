#!/bin/sh
set -e

# Function to check if SSL certificates exist
check_certificates() {
    echo "Checking for SSL certificates..."
    
    # Check for chardouin.fr certificates
    if [ ! -f "/etc/nginx/ssl/chardouin.fr.cer" ] || [ ! -f "/etc/nginx/ssl/chardouin.fr.key" ]; then
        echo "WARNING: SSL certificates for chardouin.fr not found!"
        echo "Please make sure to mount the IONOS certificates to /etc/nginx/ssl/"
    else
        echo "SSL certificates for chardouin.fr found."
    fi
    
    # Check for hardouin.osteopathe.fr certificates
    if [ ! -f "/etc/nginx/ssl/hardouin.osteopathe.fr.cer" ] || [ ! -f "/etc/nginx/ssl/hardouin.osteopathe.fr.key" ]; then
        echo "WARNING: SSL certificates for hardouin.osteopathe.fr not found!"
        echo "Please make sure to mount the IONOS certificates to /etc/nginx/ssl/"
    else
        echo "SSL certificates for hardouin.osteopathe.fr found."
    fi
}

# Create directories for website content if they don't exist
mkdir -p /var/www/chardouin.fr/html
mkdir -p /var/www/hardouin.osteopathe.fr/html

# Check for SSL certificates
check_certificates

# Start Nginx
echo "Starting Nginx..."
exec "$@"
