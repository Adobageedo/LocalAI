// lib/supabase/authFetch.ts

// Environment variable to bypass auth in development
// Use NEXT_PUBLIC_ prefix to make it available in both server and client components
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false"

/**
 * Makes an authenticated fetch request using Supabase authentication
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise with the fetch response
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Create Supabase client
  const { cookies } = await import("next/headers")
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = createClient(cookies())
  const { data, error } = await supabase.auth.getSession()

  // Prepare headers for client component
  const clientHeadersObj: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" })
  }

  // If we have a valid session, use it for authentication
  if (data?.session?.access_token) {
    const token = data.session.access_token
    const userId = data.session.user?.id || ""

    // Add authentication headers
    clientHeadersObj["Authorization"] = `Bearer ${token}`
    clientHeadersObj["X-User-Uid"] = userId
  }
  // If auth is required and we don't have a session, throw an error
  else if (ENABLE_AUTH) {
    console.error("Authentication error: No active session found", error)
    throw new Error("User not authenticated - No active Supabase session")
  }
  // If auth is disabled (development mode), use a test token
  else {
    console.warn("⚠️ DEVELOPMENT MODE: Authentication bypassed")
    clientHeadersObj["Authorization"] = "Bearer dev-token"
    clientHeadersObj["X-User-Uid"] = "dev-user"
  }

  // Return fetch with appropriate headers
  return fetch(url, {
    ...options,
    headers: clientHeadersObj
  })
}

/**
 * Error handler for auth fetch responses
 * Provides detailed error information for debugging
 *
 * @param response - The fetch response to check
 * @returns The response if it's ok, otherwise throws an error with details
 */
export async function handleAuthFetchResponse(
  response: Response
): Promise<Response> {
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`

    try {
      // Try to parse error details from response
      const errorData = await response.json()
      if (errorData.message) {
        errorMessage = errorData.message
      } else if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      }
    } catch (e) {
      // If parsing fails, try to get text
      try {
        const errorText = await response.text()
        if (errorText) {
          errorMessage = `Server error: ${errorText}`
        }
      } catch {
        // If all fails, use the status
        errorMessage = `Server error: ${response.status}`
      }
    }

    throw new Error(errorMessage)
  }

  return response
}
