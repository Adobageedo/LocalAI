# Gmail Extension Setup

This guide explains how to build and install your React app as a Chrome extension for Gmail.

## Architecture

The extension has three main components:

1. **GmailContext** (`src/contexts/GmailContext.tsx`) - React context for Gmail integration
2. **Content Script** (`public/extension/content-script.js`) - Runs in Gmail page, extracts email data
3. **Background Worker** (`public/extension/background.js`) - Handles extension lifecycle
4. **Unified EmailContext** (`src/contexts/EmailContext.tsx`) - Auto-detects Outlook vs Gmail

## File Structure

```
frontend/
├── src/
│   └── contexts/
│       ├── OfficeContext.tsx    # Outlook integration (existing)
│       ├── GmailContext.tsx     # Gmail integration (new)
│       └── EmailContext.tsx     # Unified context (new)
└── public/
    └── extension/
        ├── manifest.json        # Chrome extension manifest
        ├── content-script.js    # Gmail DOM manipulation
        ├── background.js        # Service worker
        └── icons/              # Extension icons
            ├── icon16.png
            ├── icon32.png
            ├── icon48.png
            └── icon128.png
```

## Build Steps

### 1. Update package.json scripts

Add a new build script for the extension:

```json
{
  "scripts": {
    "build:extension": "REACT_APP_PLATFORM=gmail npm run build && npm run copy:extension"
    "copy:extension": "cp -r public/extension/* build/ && cp build/index.html build/popup.html"
  }
}
```

### 2. Update App.tsx to use unified EmailContext

```tsx
import { EmailProvider } from './contexts/EmailContext';

function App() {
  return (
    <EmailProvider>
      {/* Your app components */}
    </EmailProvider>
  );
}
```

### 3. Create extension icons

Create icons in `public/extension/icons/`:
- icon16.png (16x16)
- icon32.png (32x32)
- icon48.png (48x48)
- icon128.png (128x128)

You can use any image tool or online generator. Simple colored squares work for testing.

### 4. Build the extension

```bash
cd frontend
npm run build:extension
```

This creates a `build/` folder with:
- All React app files
- manifest.json
- content-script.js
- background.js
- icons/

### 5. Load extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your `frontend/build/` folder
5. The extension should now appear in your extensions list

### 6. Test the extension

1. Go to https://mail.google.com
2. Open an email
3. Click the extension icon in the toolbar
4. Your React app should open as a popup or side panel
5. The GmailContext will extract email data from the page

## Development Workflow

### Hot reload during development

For faster development, you can:

1. Keep `npm start` running for the React app
2. Reload the extension in `chrome://extensions/` after changes
3. Use console.log in content-script.js to debug
4. Check the extension's service worker logs in `chrome://extensions/`

### Debugging

- **React app logs**: Click extension → Right-click → Inspect popup
- **Content script logs**: Open Gmail → F12 → Console tab
- **Background worker logs**: `chrome://extensions/` → Click "service worker"
- **Check if content script loaded**: Look for "Gmail AI Assistant content script loaded" in Gmail console

## Gmail DOM Selectors

The content script uses Gmail DOM selectors that may change. If extraction fails:

1. Open Gmail and inspect the email view (F12)
2. Find the elements for subject, sender, body
3. Update selectors in `content-script.js`

Common selectors:
- Subject: `h2.hP`
- Sender: `span.gD[email]`
- Body: `div.a3s.aiL` or `div[data-message-id]`
- Reply button: `div[data-tooltip="Reply"]`
- Compose box: `div[contenteditable="true"][aria-label*="Message"]`

## Platform Detection

The unified `EmailContext` automatically detects:

```typescript
// In your components
import { useEmail } from './contexts/EmailContext';

function MyComponent() {
  const { platform, isReady, currentEmail } = useEmail();
  
  if (platform === 'outlook') {
    // Outlook-specific UI
  } else if (platform === 'gmail') {
    // Gmail-specific UI
  }
}
```

## Backend Configuration

Update your backend CORS to allow the extension:

```python
# backend/src/api/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3000",
        "https://mail.google.com",
        "chrome-extension://*",  # Allow all Chrome extensions
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Permissions Explained

The extension requests these permissions in manifest.json:

- `activeTab`: Access current tab (Gmail)
- `storage`: Save user preferences
- `tabs`: Query Gmail tabs
- `scripting`: Inject content scripts
- `host_permissions`: Access Gmail and your backend API

## Publishing (Optional)

To publish to Chrome Web Store:

1. Create a developer account ($5 fee)
2. Zip your `build/` folder
3. Upload to Chrome Web Store Developer Dashboard
4. Fill in store listing details
5. Submit for review

## Troubleshooting

### Extension doesn't load
- Check manifest.json is in build/ root
- Verify all file paths in manifest.json
- Check for syntax errors in background.js

### Can't extract email data
- Open Gmail console (F12) and check for errors
- Verify content script is injected (look for log message)
- Update DOM selectors in content-script.js

### Can't insert reply
- Check if Gmail's compose box opened
- Verify contenteditable element selector
- Try increasing setTimeout delay in insertReply()

### Backend CORS errors
- Add chrome-extension://* to allowed origins
- Check if API key is correctly passed
- Verify backend is running and accessible

## Next Steps

1. Test with different Gmail views (inbox, conversation, compose)
2. Add error handling for failed extractions
3. Implement Gmail-specific features (labels, threads)
4. Add user preferences storage using chrome.storage
5. Create better icons and branding
6. Add keyboard shortcuts in manifest.json

## Support

For Gmail API details: https://developers.google.com/gmail/api
For Chrome Extension docs: https://developer.chrome.com/docs/extensions/
