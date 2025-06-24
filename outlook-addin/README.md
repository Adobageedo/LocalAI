# Outlook Email Template Generator Add-in

This Outlook add-in integrates user authentication via Firebase and provides AI-powered email template generation capabilities.

## Features

- **User Authentication**: Firebase Authentication integration with login/register functionality
- **Email Context Detection**: Detects when an email is open or selected in Outlook
- **Template Generation**: Generates AI-powered email templates based on selected email content
- **Template Insertion**: Insert generated templates into new email drafts

## Project Structure

```
outlook-addin/
│
├── assets/            # Icons and images for the add-in
│
├── css/
│   └── taskpane.css   # Styling for the taskpane
│
├── js/
│   └── taskpane.js    # Main functionality and Firebase integration
│
├── commands.html      # Handles UI-less button commands
├── manifest.xml       # Add-in manifest definition
├── taskpane.html      # Main UI for the add-in
└── README.md          # This file
```

## Setup Instructions

1. **Firebase Configuration**:
   - Create a Firebase project at https://console.firebase.google.com/
   - Add a web app to your Firebase project
   - Copy your Firebase configuration from the Firebase console
   - Replace the placeholder config in `js/taskpane.js`

2. **API Endpoint Configuration**:
   - Ensure your template generation API is available at the endpoint specified in `js/taskpane.js`
   - The default endpoint is `https://chardouin.fr/api/generate-template`

3. **Local Development**:
   - Set up a local HTTPS server to serve the add-in files
   - Use the "npm run dev-server" command to start the dev server
   - Sideload the add-in into Outlook for testing

## Implementation Notes

- The add-in checks authentication state when it loads
- If no user is logged in, it displays login form or option to register
- Once authenticated, it checks for open/selected emails
- Template generation requires an email to be open or selected
- Generated templates can be inserted into new email drafts

## Required Backend API

The backend API should accept POST requests with:

```json
{
  "subject": "Email Subject",
  "body": "Email Content"
}
```

And return:

```json
{
  "template": "Generated template content"
}
```

Headers must include a Firebase authentication token:
```
Authorization: Bearer [user-id-token]
```
