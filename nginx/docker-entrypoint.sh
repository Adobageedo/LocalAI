#!/bin/sh
set -e

# Function to handle certificate renewal and Nginx reload
handle_certificates() {
    echo "Starting certificate monitoring process..."
    while :; do
        # Check if certificates need renewal (every 6 hours)
        sleep 6h & wait $!
        
        # Check if Let's Encrypt certificates have been updated
        if [ -f "/etc/letsencrypt/live/chardouin.fr/fullchain.pem" ]; then
            echo "Checking for certificate updates..."
            
            # Compare modification times
            CURRENT_CERT_TIME=$(stat -c %Y /etc/nginx/ssl/live/chardouin.fr/fullchain.pem 2>/dev/null || echo "0")
            NEW_CERT_TIME=$(stat -c %Y /etc/letsencrypt/live/chardouin.fr/fullchain.pem 2>/dev/null || echo "0")
            
            if [ "$NEW_CERT_TIME" -gt "$CURRENT_CERT_TIME" ]; then
                echo "New Let's Encrypt certificates detected, updating Nginx certificates..."
                cp /etc/letsencrypt/live/chardouin.fr/fullchain.pem /etc/nginx/ssl/live/chardouin.fr/fullchain.pem
                cp /etc/letsencrypt/live/chardouin.fr/privkey.pem /etc/nginx/ssl/live/chardouin.fr/privkey.pem
                chmod 644 /etc/nginx/ssl/live/chardouin.fr/fullchain.pem
                chmod 600 /etc/nginx/ssl/live/chardouin.fr/privkey.pem
                nginx -s reload
                echo "Nginx reloaded with new certificates."
            else
                echo "No certificate changes detected."
            fi
        fi
    done
}

# Start certificate monitoring in the background
handle_certificates &

# Start Nginx in the foreground
echo "Starting Nginx..."
exec "$@"
