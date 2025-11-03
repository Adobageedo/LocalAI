import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch'; // or native fetch if supported
import llmClient, { ChatMessage } from './utils/llmClient'; // your LLM streaming client

interface StreamRequest {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  rag?: boolean;           // <-- new flag
  ragCollection?: string;  // optional collection for RAG search
  topK?: number;           // optional top_k for RAG
}

interface RagDoc {
  page_content: string;
  metadata: Record<string, any>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { 
      prompt, 
      messages, 
      systemPrompt, 
      maxTokens = 500, 
      temperature = 0.7,
      rag = false,
      ragCollection="edoardo",
    } = req.body as StreamRequest;

    if (!messages && (!prompt || !prompt.trim())) {
      res.status(400).json({ error: 'Either messages array or prompt is required' });
      return;
    }
    // Build conversation messages
    let conversationMessages: ChatMessage[] = messages ?? [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt! }
    ];

    // --- RAG Integration ---
    if (rag) {
      try {
        console.log(`📨 rag: Received ${prompt}`);
        let topK=10
        const ragResponse = await fetch(
          `${process.env.RAG_API_URL || 'https://easier-snappily-ansley.ngrok-free.dev/api/rag/search'}`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': process.env.RAG_API_KEY || 'W1eqZEROOsKw9gphfEYPvPYlHqS0lSAELjbYJCWqCxFl831wqSmwlXTht6t4ABO0'  // <-- add API key header
            },

            body: JSON.stringify({
              query: prompt || "default query",
              collection: ragCollection || "edoardo",
              top_k: topK,
              split_prompt: true,
              rerank: false,
              use_hyde: false
            })
          }
        );

        if (!ragResponse.ok) {
          console.warn('RAG API returned error', await ragResponse.text());
        } else {
          const ragData = await ragResponse.json();
          const docs: RagDoc[] = ragData.documents ?? [];

          // Prepend RAG content as a system message for context
          if (docs.length > 0) {
            const contextText = docs.map((d, i) => `Document ${i + 1}: ${d.page_content}`).join('\n\n');
            conversationMessages = [
              { role: 'system' as const, content: `Use the following RAG documents to answer the user query:\n\n${contextText}` },
              ...conversationMessages
            ];
          }
        }
      } catch (err) {
        console.error('RAG API call failed', err);
      }
    }

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let chunkNumber = 0;

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
