import type { VercelRequest, VercelResponse } from '@vercel/node';
import llmClient, { ChatMessage } from './utils/llmClient'; // your LLM streaming client

interface StreamRequest {
  prompt?: string;  // Legacy support for single prompt
  messages?: ChatMessage[];  // Conversation history
  systemPrompt?: string;  // Optional system message
  maxTokens?: number;
  temperature?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, messages, systemPrompt, maxTokens = 500, temperature = 0.7 } = req.body as StreamRequest;

    // Validate: either messages or prompt must be provided
    if (!messages && (!prompt || !prompt.trim())) {
      res.status(400).json({ error: 'Either messages array or prompt is required' });
      return;
    }

    console.log(`📨 promptLLM: Received ${messages ? `${messages.length} messages` : 'single prompt'}`);

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let chunkNumber = 0;

    // Build conversation messages
    let conversationMessages: ChatMessage[];
    
    if (messages) {
      // Use provided conversation history
      conversationMessages = messages;
    } else {
      // Legacy: convert single prompt to messages format
      conversationMessages = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt! }
      ];
    }

    for await (const chunk of llmClient.generateStream({
      messages: conversationMessages,
      temperature,
      maxTokens
    })) {
      chunkNumber++;

      if (chunk.delta) {
        fullText += chunk.delta;

        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          chunkNumber,
          delta: chunk.delta,
          done: false
        })}\n\n`);
      }

      if (chunk.done) {
        res.write(`data: ${JSON.stringify({
          type: 'done',
          chunkNumber,
          fullText
        })}\n\n`);
        res.end();
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
}