# React Outlook Add-in Taskpane

A modern React-based taskpane for the Outlook add-in with Firebase authentication and AI-powered email template generation.

## Features

- 🔐 **Firebase Authentication** - Secure user login and registration
- 📧 **Office.js Integration** - Access to Outlook email context and composition
- 🤖 **AI Template Generation** - Smart email templates using external API
- 🎨 **Fluent UI Design** - Microsoft-consistent user interface
- ⚡ **React Context** - Clean state management for auth and Office integration

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Update `src/firebase.ts` with your Firebase project configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Development Server

```bash
npm start
```

Runs the app at [http://localhost:3000](http://localhost:3000)

### 4. Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Integration with Outlook Add-in

### For Local Testing

1. Build the React app: `npm run build`
2. Copy the build files to your add-in's web server
3. Update the add-in manifest to point to the React app
4. Sideload the manifest in Outlook

### For HTTPS Development

To test with Outlook, you'll need HTTPS. Use the parent directory's setup:

```bash
# From the main add-in directory
./setup-local-test.sh
```

Then serve the React build over HTTPS on port 8443.

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # App header with branding
│   ├── AuthSection.tsx # Firebase auth UI
│   ├── EmailContext.tsx # Display current email info
│   └── TemplateGenerator.tsx # AI template generation
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Firebase auth state
│   └── OfficeContext.tsx # Office.js integration
├── types/             # TypeScript declarations
├── firebase.ts        # Firebase configuration
└── App.tsx           # Main app component
```

## Key Components

### AuthContext
- Manages Firebase authentication state
- Provides login, register, logout functions
- Handles auth state persistence

### OfficeContext
- Manages Office.js initialization
- Loads current email context (subject, sender, body)
- Provides template insertion functionality

### TemplateGenerator
- AI-powered email template generation
- Configurable tone and context-aware prompts
- Integration with external AI API

## API Integration

The app integrates with an AI API at `https://chardouin.fr/api/prompt` for template generation. The API expects:

```json
{
  "prompt": "User's template request",
  "tone": "professional|friendly|formal|casual|urgent|apologetic",
  "context": {
    "subject": "Email subject",
    "from": "Sender email",
    "body": "Email body preview"
  },
  "user_id": "Firebase user ID"
}
```

## Development Notes

- Uses React 18 for compatibility with Fluent UI
- Office.js types included via `@types/office-js`
- Graceful fallback when Office.js is not available (development mode)
- Responsive design optimized for Outlook taskpane width

## Troubleshooting

### Build Issues
- Ensure React 18.x is installed for Fluent UI compatibility
- Use `--legacy-peer-deps` if encountering dependency conflicts

### Office.js Issues
- Verify Office.js is loaded before the React app initializes
- Check browser console for Office.js initialization errors
- Ensure HTTPS is used when testing with Outlook

### Firebase Issues
- Verify Firebase configuration is correct
- Check Firebase console for authentication setup
- Ensure web app is registered in Firebase project
