#!/bin/sh
set -e

# Function to handle certificate renewal and Nginx reload
handle_certificates() {
    echo "Starting certificate monitoring process..."
    while :; do
        # Check if certificates need renewal (every 6 hours)
        sleep 6h & wait $!
        
        # Check if certificates have been updated
        if [ -f "/etc/nginx/ssl/live/chardouin.fr/fullchain.pem.new" ]; then
            echo "New certificates detected, reloading Nginx..."
            mv /etc/nginx/ssl/live/chardouin.fr/fullchain.pem.new /etc/nginx/ssl/live/chardouin.fr/fullchain.pem
            mv /etc/nginx/ssl/live/chardouin.fr/privkey.pem.new /etc/nginx/ssl/live/chardouin.fr/privkey.pem
            nginx -s reload
            echo "Nginx reloaded with new certificates."
        else
            echo "No certificate changes detected."
        fi
    done
}

# Start certificate monitoring in the background
handle_certificates &

# Start Nginx in the foreground
echo "Starting Nginx..."
exec "$@"
