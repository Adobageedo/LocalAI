#!/bin/sh
set -e

# Function to handle certificate renewal and Nginx reload
handle_certificates() {
    echo "Starting certificate monitoring process..."
    while :; do
        # Check if certificates need renewal (every 6 hours)
        sleep 6h & wait $!
        
        # Check if Let's Encrypt certificates have been updated
        # Find any Let's Encrypt certificate directory for our domain
        cert_dirs=$(find /etc/letsencrypt/live -maxdepth 1 -name "chardouin.fr*" -type d 2>/dev/null)
        
        if [ -n "$cert_dirs" ]; then
            echo "Checking for certificate updates..."
            
            # Get the most recent certificate directory
            for cert_dir in $cert_dirs; do
                if [ -f "$cert_dir/fullchain.pem" ]; then
                    echo "Found certificate in $cert_dir"
                    
                    # Compare modification times
                    CURRENT_CERT_TIME=$(stat -c %Y /etc/nginx/ssl/live/chardouin.fr/fullchain.pem 2>/dev/null || echo "0")
                    NEW_CERT_TIME=$(stat -c %Y "$cert_dir/fullchain.pem" 2>/dev/null || echo "0")
                    
                    if [ "$NEW_CERT_TIME" -gt "$CURRENT_CERT_TIME" ]; then
                        echo "New Let's Encrypt certificates detected in $cert_dir, updating Nginx certificates..."
                        cp "$cert_dir/fullchain.pem" /etc/nginx/ssl/live/chardouin.fr/fullchain.pem
                        cp "$cert_dir/privkey.pem" /etc/nginx/ssl/live/chardouin.fr/privkey.pem
                        chmod 644 /etc/nginx/ssl/live/chardouin.fr/fullchain.pem
                        chmod 600 /etc/nginx/ssl/live/chardouin.fr/privkey.pem
                        nginx -s reload
                        echo "Nginx reloaded with new certificates from $cert_dir."
                        break
                    fi
                fi
            done
        else
            echo "No Let's Encrypt certificates found for chardouin.fr"
        fi
    done
}

# Start certificate monitoring in the background
handle_certificates &

# Start Nginx in the foreground
echo "Starting Nginx..."
exec "$@"
