#!/bin/bash
set -e

echo "🔨 Building Gmail Extension..."

# Load extension environment variables
if [ -f ".env.extension" ]; then
  echo "📝 Loading extension environment..."
  export $(cat .env.extension | grep -v '^#' | xargs)
fi

# Build React app
echo "📦 Building React app..."
npm run build

# Copy extension files
echo "📋 Copying extension files..."
cp public/extension/manifest.json build/
cp public/extension/content-script.js build/
cp public/extension/background.js build/

# Copy icons if they exist
if [ -d "public/extension/icons" ]; then
  echo "🎨 Copying icons..."
  mkdir -p build/icons
  cp -r public/extension/icons/* build/icons/
else
  echo "⚠️  No icons found. Please create icons in public/extension/icons/"
  echo "   Required: icon16.png, icon32.png, icon48.png, icon128.png"
fi

# Use extension-specific HTML (without Office.js)
echo "📄 Creating extension index.html..."
if [ -f "public/extension-index.html" ]; then
  # Backup original
  cp build/index.html build/index.html.original
  
  # Extract only the React bundle scripts (not Office.js)
  REACT_SCRIPTS=$(grep -o '<script defer="defer" src="/static/js/[^"]*"></script>' build/index.html || echo "")
  REACT_STYLES=$(grep -o '<link href="/static/css/[^"]*" rel="stylesheet">' build/index.html || echo "")
  
  # Start with extension template
  cp public/extension-index.html build/index.html
  
  # Inject React bundles
  if [ -n "$REACT_STYLES" ]; then
    sed -i '' "s|</head>|  $REACT_STYLES\n  </head>|" build/index.html
  fi
  
  if [ -n "$REACT_SCRIPTS" ]; then
    sed -i '' "s|</body>|  $REACT_SCRIPTS\n  </body>|" build/index.html
  fi
  
  echo "✅ Replaced index.html with extension version (no Office.js)"
else
  echo "⚠️  extension-index.html not found, using default"
fi

echo "✅ Extension built successfully!"
echo "📁 Output directory: $(pwd)/build"
echo ""
echo "To install:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'build' folder"
echo ""
echo "To create a zip for distribution:"
echo "cd build && zip -r ../gmail-extension.zip . && cd .."
