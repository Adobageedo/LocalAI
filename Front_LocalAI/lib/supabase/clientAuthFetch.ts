// lib/supabase/clientAuthFetch.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Environment variable to bypass auth in development
// Use NEXT_PUBLIC_ prefix to make it available in both server and client components
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false"

/**
 * Makes an authenticated fetch request using Supabase authentication
 * For use in client components
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise with the fetch response
 */
export async function clientAuthFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Create Supabase client for client components
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.auth.getSession()

  // Prepare headers
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
