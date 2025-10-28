import type { VercelRequest, VercelResponse } from '@vercel/node';
import llmClient from './utils/llmClient'; // your LLM streaming client

interface StreamRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, maxTokens = 500, temperature = 1 } = req.body as StreamRequest;

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let chunkNumber = 0;

    for await (const chunk of llmClient.generateStream({
      systemPrompt: '',
      userPrompt: prompt,
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
