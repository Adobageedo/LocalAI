import { createParser } from "eventsource-parser"

export interface LocalAIStreamCallbacks {
  onStart?: () => void
  onToken: (token: string) => void
  onCompletion?: (completion: string) => void
  onFinal?: (completion: string) => void
}

export async function LocalAIStream(
  response: Response,
  callbacks?: LocalAIStreamCallbacks
): Promise<ReadableStream<Uint8Array>> {
  // Check if response is valid before proceeding
  if (!response.ok) {
    throw new Error(
      `Response not OK: ${response.status} ${response.statusText}`
    )
  }

  // Log basic response info
  console.log(
    `[${new Date().toISOString()}] LocalAIStream function called with response status:`,
    response.status
  )

  const encoder = new TextEncoder()

  // Create a transform stream for processing the response
  const transformStream = new TransformStream()
  const writer = transformStream.writable.getWriter()

  // Process in the background without awaiting
  ;(async () => {
    try {
      const contentType = response.headers.get("content-type") || ""
      const isSSE = contentType.includes("text/event-stream")
      console.log(
        `[${new Date().toISOString()}] Response content type:`,
        contentType,
        "Is SSE:",
        isSSE
      )

      if (isSSE) {
        // Handle Server-Sent Events (streaming)
        console.log(`[${new Date().toISOString()}] Processing as SSE stream`)

        let fullText = ""
        let sources: any[] = []

        // Make sure we have a body to read from
        if (!response.body) {
          throw new Error("Response body is null")
        }

        // Get a reader for the body
        const reader = response.body.getReader()

        // Process the stream chunk by chunk
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Decode the chunk to text
          const chunkText = new TextDecoder().decode(value)

          // Process SSE format - each line starting with 'data: '
          const lines = chunkText.split("\n")

          for (const line of lines) {
            if (!line.trim()) continue

            if (line.startsWith("data: ")) {
              const dataContent = line.substring(6).trim() // Remove 'data: '

              // Check for stream end marker
              if (dataContent === "[DONE]") {
                continue
              }

              try {
                // Try to parse as JSON
                const data = JSON.parse(dataContent)

                // Handle text chunks - check for both 'chunk' and 'text' fields
                if (
                  data.hasOwnProperty("chunk") ||
                  data.hasOwnProperty("text")
                ) {
                  const content =
                    data.chunk !== undefined
                      ? data.chunk
                      : data.text !== undefined
                        ? data.text
                        : ""
                  fullText += content
                  await writer.write(encoder.encode(content))
                } else {
                }

                // Collect sources if present
                if (data.sources && Array.isArray(data.sources)) {
                  sources = [...sources, ...data.sources]
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE data as JSON:", parseError)
                // If not valid JSON, just write the raw content
                await writer.write(encoder.encode(dataContent))
                fullText += dataContent
              }
            } else if (line.trim()) {
              // Handle non-data lines if they have content
              console.log("Non-data line in SSE:", line)
            }
          }
        }

        // After stream ends, append sources if we have any
        if (sources.length > 0) {
          const sourcesText =
            "\n\n**Sources:**\n" +
            sources
              .map((source: any, index: number) => {
                const filename =
                  source.filename || source.name || `Source ${index + 1}`
                const url = source.url || ""
                // If URL is available, format as markdown link
                return url ? `- [${filename}](${url})` : `- ${filename}`
              })
              .join("\n")

          await writer.write(encoder.encode(sourcesText))
          fullText += sourcesText
        }

        // Call callbacks if provided
        if (callbacks?.onCompletion) {
          callbacks.onCompletion(fullText)
        }

        if (callbacks?.onFinal) {
          callbacks.onFinal(fullText)
        }
      } else {
        // Handle regular JSON response (non-streaming)

        // Parse the response as JSON
        const responseData = await response.json()

        // Extract the answer
        if (!responseData.answer && responseData.answer !== "") {
          throw new Error("Backend response missing answer field")
        }

        let formattedAnswer = responseData.answer || ""

        // Format sources if present
        if (responseData.sources && responseData.sources.length > 0) {
          formattedAnswer += "\n\n**Sources:**\n"
          responseData.sources.forEach((source: any, index: number) => {
            const filename =
              source.filename || source.name || `Source ${index + 1}`
            const url = source.url || ""
            // If URL is available, format as markdown link
            formattedAnswer += url
              ? `- [${filename}](${url})\n`
              : `- ${filename}\n`
          })
        }

        // Write the formatted answer to the stream
        await writer.write(encoder.encode(formattedAnswer))

        // Call callbacks if provided
        if (callbacks?.onCompletion) {
          callbacks.onCompletion(formattedAnswer)
        }

        if (callbacks?.onFinal) {
          callbacks.onFinal(formattedAnswer)
        }
      }
    } catch (error) {
      console.error("Error in LocalAIStream:", error)

      // Try to get more information about the error
      if (error instanceof Error) {
        await writer.write(encoder.encode(`Error: ${error.message}`))
      } else {
        await writer.write(encoder.encode(`Unknown error occurred`))
      }

      // Log response details for debugging
      console.error("Response status:", response.status)
      console.error(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      )

      try {
        // Try to get the raw response text
        const clonedResponse = response.clone()
        const responseText = await clonedResponse.text()
        console.error("Response text:", responseText.substring(0, 500))
      } catch (textError) {
        console.error("Could not get response text:", textError)
      }
    } finally {
      // Always close the writer when done
      await writer.close()
    }
  })().catch(error => {
    console.error("Unhandled error in stream processing:", error)
  })

  // Return the readable side of the transform stream
  return transformStream.readable
}
