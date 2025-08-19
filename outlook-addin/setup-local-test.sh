#!/bin/bash

echo "🚀 Setting up Outlook Add-in for Local Testing"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "taskpane.html" ]; then
    echo "❌ Error: Please run this script from the outlook-addin directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "📦 Installing mkcert for SSL certificates..."
    if command -v brew &> /dev/null; then
        brew install mkcert
    else
        echo "❌ Please install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

# Install mkcert CA
echo "🔐 Setting up local CA..."
mkcert -install

# Generate SSL certificates
echo "📜 Generating SSL certificates..."
mkcert localhost 127.0.0.1

# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "📦 Installing http-server..."
    npm install -g http-server
fi

echo ""
echo "✅ Setup complete! Now you can:"
echo ""
echo "1. Start the HTTPS server:"
echo "   http-server -p 8443 -S -C localhost.pem -K localhost-key.pem"
echo ""
echo "2. Open Outlook and sideload the add-in using:"
echo "   manifest-local.xml"
echo ""
echo "3. The add-in will be available at:"
echo "   https://localhost:8443"
echo ""
echo "🔧 Next steps:"
echo "- Configure Firebase in js/taskpane.js"
echo "- Update API endpoint if needed"
echo "- Test with an email open in Outlook"
echo ""
