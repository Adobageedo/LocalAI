/**
 * Outlook Prompt API - Streaming Version
 * 
 * Generates email templates/responses with real-time streaming
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailPromptBuilder, SupportedLanguage, EmailTone } from '../config/emailConfig';
import llmClient from '../utils/llmClient';
import { styleAnalysisClient, ragClient } from '../utils/externalApiClients';

// Request types
interface OutlookPromptRequest {
  // User Input
  additionalInfo?: string;
  tone: string;
  language: string;
  use_rag?: boolean;
  
  // Email Context
  subject?: string;
  from?: string;
  body?: string;
  conversationHistory?: string;
  conversationId?: string;
  
  // User ID
  userId?: string;
}

// Validate and normalize language
function validateLanguage(lang: string): SupportedLanguage {
  const normalized = lang.toLowerCase();
  if (Object.values(SupportedLanguage).includes(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }
  return SupportedLanguage.FRENCH;
}

// Validate and normalize tone
function validateTone(tone: string): EmailTone {
  if (Object.values(EmailTone).includes(tone as EmailTone)) {
    return tone as EmailTone;
  }
  return EmailTone.PROFESSIONAL;
}

/**
 * Calculate appropriate max tokens based on input
 */
function calculateMaxTokens(
  body?: string,
  conversationHistory?: string,
  additionalInfo?: string
): number {
  const totalInput = (body?.length || 0) + 
                    (conversationHistory?.length || 0) + 
                    (additionalInfo?.length || 0);
  
  const estimatedInputTokens = Math.ceil(totalInput / 4);
  
  // Base tokens for response
  let maxTokens = 500;
  
  // Adjust based on input size
  if (estimatedInputTokens > 1000) {
    maxTokens = 800;
  } else if (estimatedInputTokens > 500) {
    maxTokens = 600;
  }
  
  return maxTokens;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestData: OutlookPromptRequest = req.body;

    const tone = validateTone(requestData.tone || 'professional');
    const language = validateLanguage(requestData.language || 'fr');
    const useRag = requestData.use_rag ?? false;
    const userId = requestData.userId || 'anonymous';

    console.log('🌊 Streaming email template/response');
    console.log('Tone:', tone);
    console.log('Language:', language);
    console.log('Has conversation history:', !!requestData.conversationHistory);

    // Initialize prompt builder
    const promptBuilder = new EmailPromptBuilder();

    // Build email context
    const emailContext = promptBuilder.buildEmailContext({
      subject: requestData.subject || null,
      fromEmail: requestData.from || null,
      body: requestData.body || null
    });

    // Get user's writing style (if available)
    let styleContext = '';
    try {
      const styleResponse = await styleAnalysisClient.getUserStyle(userId);
      if (styleResponse.hasStyle) {
        styleContext = `\n\nUser Writing Style:\n${styleResponse.styleContext}`;
      }
    } catch (error) {
      console.error('Style analysis failed:', error);
    }

    // Get RAG information if enabled
    let ragSources: any[] = [];
    let additionalInfo = requestData.additionalInfo || '';
    
    if (useRag && additionalInfo) {
      try {
        const ragResponse = await ragClient.getRelevantInfo(additionalInfo, userId);
        if (ragResponse.hasResults) {
          ragSources = ragResponse.sources;
          const ragContext = ragSources
            .map((source, idx) => `\nSource ${idx + 1}: ${source.content}`)
            .join('\n');
          additionalInfo += `\n\nRelevant Information:${ragContext}`;
        }
      } catch (error) {
        console.error('RAG fetch failed:', error);
      }
    }

    // Add conversation history context if available
    if (requestData.conversationHistory) {
      additionalInfo += `\n\nConversation History:\n${requestData.conversationHistory}`;
    }

    // Build system prompt
    const systemPrompt = promptBuilder.buildSystemPrompt({
      tone,
      language,
      emailContext,
      additionalInfo,
      useRag
    }) + styleContext;

    // Build user prompt
    const userPrompt = requestData.additionalInfo 
      ? `Please generate an appropriate email response based on the following: ${requestData.additionalInfo}. Return only the text of the email.`
      : 'Please generate an appropriate email response based on the context provided. Return only the text of the email.';

    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);

    // Calculate optimal token limit
    const maxTokens = calculateMaxTokens(
      requestData.body,
      requestData.conversationHistory,
      requestData.additionalInfo
    );

    console.log(`🎯 Max tokens: ${maxTokens}`);
    console.log('🌊 Starting stream...');

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let chunkNumber = 0;

    // Stream the response
    for await (const chunk of llmClient.generateStream({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens
    })) {
      chunkNumber++;
      
      if (chunk.delta) {
        fullText += chunk.delta;
        
        // Send chunk as SSE
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          chunkNumber,
          delta: chunk.delta,
          done: false
        })}\n\n`);
      }

      if (chunk.done) {
        // Send final message
        res.write(`data: ${JSON.stringify({
          type: 'done',
          chunkNumber,
          fullText,
          sources: ragSources,
          metadata: {
            tone,
            language,
            use_rag: useRag,
            model: chunk.model,
            tokensUsed: chunk.tokensUsed,
            style_analysis_used: !!styleContext,
            has_conversation_history: !!requestData.conversationHistory
          }
        })}\n\n`);
        
        console.log('✅ Stream complete. Final text length:', fullText.length);
        
        res.end();
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
}
