// Authentication providers utility for connecting to external services
// Based on the logic from rag-frontend/src/lib/authProviders.js
import { clientAuthFetch } from "@/lib/supabase/clientAuthFetch"
/**
 * Authentication providers for external services
 */
export const authProviders = {
  /**
   * Get all connected capabilities and providers for the current user
   * @returns Promise with capabilities, providers, and provider_capabilities
   */
  getUserCapabilities: async (): Promise<{
    capabilities: string[]
    providers: Record<string, string>
    provider_capabilities: Record<string, string[]>
  }> => {
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/sources/provider/`

      const response = await clientAuthFetch(endpoint, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(
          `Failed to get user capabilities: ${response.statusText}`
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error getting user capabilities:", error)
      return {
        capabilities: [],
        providers: {},
        provider_capabilities: {}
      }
    }
  },
  /**
   * Check if the user is authenticated with a specific provider
   * @param provider - The provider ('gmail', 'outlook', 'gdrive', 'gcalendar', 'outlook_calendar')
   * @returns Promise with authentication status
   */
  checkAuthStatus: async (
    provider: string
  ): Promise<{ authenticated: boolean; email?: string }> => {
    try {
      // Determine the correct API endpoint based on provider
      let endpoint = ""

      if (
        provider === "gmail" ||
        provider === "gdrive" ||
        provider === "gcalendar"
      ) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/db/gdrive/auth_status`
      } else if (
        provider === "outlook" ||
        provider === "outlook_calendar" ||
        provider === "onedrive"
      ) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/db/outlook/auth_status`
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      const response = await clientAuthFetch(endpoint, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`Failed to check auth status: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error checking auth status for ${provider}:`, error)
      return { authenticated: false }
    }
  },

  /**
   * Authenticate with a provider
   * @param provider - The provider ('gmail', 'outlook', 'gdrive', 'gcalendar', 'outlook_calendar')
   * @returns Promise that resolves when authentication is complete
   */
  authenticate: async (provider: string): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Determine the correct auth URL based on provider
        let authUrl = ""
        let scope = ""

        if (provider === "gmail") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/google/login`
          scope = "gmail"
        } else if (provider === "gdrive") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/google/login`
          scope = "drive"
        } else if (provider === "gcalendar") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/google/login`
          scope = "calendar"
        } else if (provider === "outlook") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/microsoft/login`
          scope = "mail"
        } else if (provider === "outlook_calendar") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/microsoft/login`
          scope = "calendar"
        } else if (provider === "onedrive") {
          authUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/microsoft/login`
          scope = "files"
        } else {
          throw new Error(`Unsupported provider: ${provider}`)
        }

        // Add scope parameter
        authUrl = `${authUrl}?scope=${scope}`

        try {
          const response = await clientAuthFetch(`${authUrl}`)
          if (!response.ok) {
            throw new Error(`Error getting auth URL: ${response.statusText}`)
          }
          const data = await response.json()
          authUrl = data.auth_url
        } catch (error) {
          console.error(`Error getting auth URL:`, error)
          throw error
        }

        // Open popup for authentication
        const width = 600
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
          authUrl,
          "authPopup",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        )

        if (!popup) {
          reject(
            new Error(
              "Failed to open authentication popup. Please allow popups for this site."
            )
          )
          return
        }

        // Set up interval to check authentication status
        const checkAuthInterval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkAuthInterval)

            // Check authentication status
            const authStatus = await authProviders.checkAuthStatus(provider)
            if (authStatus.authenticated) {
              resolve(true)
            } else {
              reject(
                new Error("Authentication window was closed before completion")
              )
            }
          }
        }, 1000)

        // Set up message listener for callback
        const messageListener = (event: MessageEvent) => {
          if (event.data === "auth_success") {
            window.removeEventListener("message", messageListener)
            clearInterval(checkAuthInterval)
            popup.close()
            resolve(true)
          }
        }

        window.addEventListener("message", messageListener)

        // Safety timeout (2 minutes)
        setTimeout(() => {
          window.removeEventListener("message", messageListener)
          clearInterval(checkAuthInterval)
          if (!popup.closed) popup.close()
          reject(new Error("Authentication timed out"))
        }, 120000)
      } catch (error) {
        console.error(`Error authenticating with ${provider}:`, error)
        reject(error)
      }
    })
  },

  /**
   * Revoke access to a provider
   * @param provider - The provider ('gmail', 'outlook', 'gdrive', 'gcalendar', 'outlook_calendar')
   * @returns Promise with revocation result
   */
  revokeAccess: async (provider: string): Promise<any> => {
    try {
      // Determine the correct API endpoint based on provider
      let endpoint = ""

      if (
        provider === "gmail" ||
        provider === "gdrive" ||
        provider === "gcalendar"
      ) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/google/revoke_access`
      } else if (
        provider === "outlook" ||
        provider === "outlook_calendar" ||
        provider === "onedrive"
      ) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/auth/microsoft/revoke_access`
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      const response = await clientAuthFetch(endpoint, {
        method: "POST",
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`Failed to revoke access: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error revoking access for ${provider}:`, error)
      throw error
    }
  },

  /**
   * Start data ingestion/synchronization for a provider
   * @param provider - The provider ('gmail', 'outlook', 'gdrive', 'onedrive', 'gcalendar', 'outlook_calendar')
   * @param options - Options for ingestion
   * @param options.forceReingest - Force reingestion of documents
   * @returns Promise with the sync operation result
   */
  startIngestion: async (
    provider: string,
    options: { forceReingest?: boolean } = {}
  ): Promise<any> => {
    try {
      // Map the provider to the backend's expected format
      let backendProvider = provider

      // Convert provider names if needed
      if (provider === "gcalendar") backendProvider = "google_calendar"
      if (provider === "outlook_calendar") backendProvider = "outlook_calendar"

      // Prepare request body
      const requestBody = {
        provider: backendProvider,
        force_reingest: options.forceReingest || false
      }

      console.log("Sending sync request:", requestBody)

      const response = await clientAuthFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/sources/sync/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        throw new Error(
          `Failed to start ingestion for ${provider}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error(`Error starting ingestion for ${provider}:`, error)
      throw error
    }
  }
}
