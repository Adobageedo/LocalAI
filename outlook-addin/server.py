#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import os

# Change to the directory containing the add-in files
os.chdir('/Users/edoardo/Documents/LocalAI/outlook-addin')

PORT = 8443
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at https://localhost:{PORT}")
    
    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    
    # You'll need to create these certificate files first
    try:
        context.load_cert_chain('localhost.pem', 'localhost-key.pem')
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        print("SSL enabled - serving over HTTPS")
    except FileNotFoundError:
        print("SSL certificates not found. Please create localhost.pem and localhost-key.pem")
        print("Run: mkcert localhost 127.0.0.1")
        exit(1)
    
    httpd.serve_forever()
