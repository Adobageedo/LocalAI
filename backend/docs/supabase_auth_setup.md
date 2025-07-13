# Supabase Authentication Setup

This document explains how to set up Supabase authentication for the LocalAI backend API.

## Overview

The backend API now supports Supabase authentication, replacing the previous Firebase authentication system. This allows the frontend to authenticate users via Supabase and ensures seamless user identity verification in the backend.

## Environment Variables

Add the following environment variables to your backend environment:

```
# Supabase Authentication Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Authentication Control
ENABLE_AUTH=true  # Set to "false" for development without auth
```

## How to Get Supabase Credentials

1. **SUPABASE_URL**: This is your Supabase project URL, found in the Supabase dashboard under Project Settings > API.
2. **SUPABASE_ANON_KEY**: This is the "anon" public API key, found in Project Settings > API > Project API keys.
3. **SUPABASE_SERVICE_KEY**: This is the "service_role" secret API key, found in Project Settings > API > Project API keys.
4. **SUPABASE_JWT_SECRET**: This is your JWT secret, found in Project Settings > API > JWT Settings.

## Frontend Integration

The frontend should include the Supabase JWT token in the Authorization header for all API requests:

```typescript
// Example of setting the Authorization header with Supabase token
const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Use these headers in your fetch or axios requests
```

## Authentication Flow

1. User logs in through the frontend using Supabase Auth
2. Frontend obtains a JWT token from Supabase
3. Frontend includes this token in the Authorization header for API requests
4. Backend verifies the token using the Supabase JWT secret
5. If valid, the user information is extracted and attached to the request

## Development Mode

For development without authentication, set `ENABLE_AUTH=false` in your environment. This will bypass authentication checks and use a default development user.

## Provider-Agnostic Architecture

The authentication system is designed to be provider-agnostic, making it easier to:

1. Support multiple authentication providers in the future
2. Extend to other communication channels beyond email (like Slack or Teams)
3. Customize authentication behavior through user preferences

## Error Reporting

The authentication system includes enhanced error reporting to help diagnose issues:

- Detailed error messages for token validation failures
- Logging of authentication attempts and failures
- Structured error responses for API clients

## Security Considerations

1. Always keep your `SUPABASE_SERVICE_KEY` and `SUPABASE_JWT_SECRET` secure
2. In production, always set `ENABLE_AUTH=true`
3. Consider implementing token refresh mechanisms for long-lived sessions
4. Monitor authentication logs for suspicious activity

## Adding New Authentication Providers

To add support for additional authentication providers:

1. Create a new utility file (e.g., `auth_provider_utils.py`) in the `middleware` directory
2. Implement token verification functions specific to that provider
3. Update the `auth.py` file to use the new provider's verification logic
4. Update documentation to reflect the new provider support
