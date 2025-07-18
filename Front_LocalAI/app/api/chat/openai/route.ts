import { StreamingTextResponse } from "ai"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { LocalAIStream } from "@/lib/utils/local-stream"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()

  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    // Skip OpenAI API key check since we're using a local backend
    // checkApiKey(profile.openai_api_key, "OpenAI")

    // Extract the user's question from the messages array
    const userQuestion =
      messages.length > 0 ? messages[messages.length - 1].content : ""

    // Convert previous messages to conversation history format
    const conversationHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Prepare the request payload
    const payload: {
      model: string
      question: string
      temperature: number
      use_retrieval: boolean
      conversation_history: Array<{ role: string; content: string }>
      include_profile_context?: boolean
      stream: boolean
    } = {
      model: "gpt-4.1-mini", // Always use GPT-4.1 Mini
      question: userQuestion,
      temperature:
        typeof chatSettings.temperature === "number"
          ? chatSettings.temperature
          : 0.7,
      use_retrieval: Boolean(chatSettings.useRetrieval), // Use the user's choice from chat input
      conversation_history: conversationHistory || [],
      stream: false // Enable streaming from the backend
    }
    console.log("Use retrieval:", chatSettings.useRetrieval)
    // Only include profile context if it's defined
    if (typeof chatSettings.includeProfileContext !== "undefined") {
      payload.include_profile_context = Boolean(
        chatSettings.includeProfileContext
      )
    }

    // Import the authFetch utility
    const { authFetch } = await import("@/lib/supabase/authFetch")

    // Send request to local backend using authFetch for authentication
    const response = await authFetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/prompt`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    )
    if (!response.ok) {
      // Try to get the error message from the response
      const errorText = await response.text()
      let errorMessage = `Backend server error: ${response.status}`

      try {
        // Try to parse the error as JSON
        const errorData = JSON.parse(errorText)
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (e) {
        // If parsing fails, use the raw text if available
        if (errorText) {
          errorMessage = `Backend error: ${errorText}`
        }
      }

      console.error("Backend API error:", errorMessage)
      throw new Error(errorMessage)
    }
    // Log basic response info without trying to read the body
    console.log(
      "Response from backend received, status:",
      response.status,
      "Content-Type:",
      response.headers.get("content-type")
    )

    try {
      // Process the response with LocalAIStream
      const stream = await LocalAIStream(response)
      return new StreamingTextResponse(stream)
    } catch (streamError) {
      console.error("Error in LocalAIStream:", streamError)
      console.error("Response status:", response.status)
      console.error(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      )

      // Try to get response text for debugging if possible
      try {
        // We need to clone the response since the original might be locked or consumed
        const textResponse = response.clone()
        const text = await textResponse.text()
        console.log("Response text preview:", text.substring(0, 200))
      } catch (textError) {
        console.error("Could not get response text:", textError)
      }

      // Re-throw the original error
      throw streamError
    }
  } catch (error: any) {
    console.error("Error in POST handler:", error)
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    console.error(`Error code: ${errorCode}, message: ${errorMessage}`)

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
