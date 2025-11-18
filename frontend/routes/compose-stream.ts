import { Request, Response, Router } from 'express';
import { EmailPromptBuilder, SupportedLanguage, EmailTone } from '../api/config/emailConfig';
import llmClient from '../api/utils/llmClient';
import { styleAnalysisClient, ragClient } from '../api/utils/externalApiClients';

const router = Router();

// Request types
interface ComposeRequest {
  subject?: string;
  body?: string;
  from?: string;
  to?: string;
  additionalInfo?: string;
  tone: string;
  language: string;
  useRag?: boolean;
  userId?: string;
  conversationId?: string;
  operation: 'generate' | 'correct' | 'reformulate';
}

/**
 * Calculate appropriate max tokens based on input length
 */
function calculateMaxTokens(operation: string, emailBody?: string, additionalInfo?: string): number {
  const inputLength = (emailBody?.length || 0) + (additionalInfo?.length || 0);
  const estimatedInputTokens = Math.ceil(inputLength / 4);
  
  let maxTokens: number;
  
  switch (operation) {
    case 'generate':
      if (inputLength < 100) maxTokens = 200;
      else if (inputLength < 300) maxTokens = 400;
      else maxTokens = 600;
      break;
    case 'correct':
      maxTokens = Math.min(Math.max(estimatedInputTokens + 50, 150), 800);
      break;
    case 'reformulate':
      maxTokens = Math.min(Math.max(Math.ceil(estimatedInputTokens * 1.3), 200), 1000);
      break;
    default:
      maxTokens = 300;
  }
  
  return maxTokens;
}

// Validate functions
function validateLanguage(lang: string): SupportedLanguage {
  if (Object.values(SupportedLanguage).includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return SupportedLanguage.FRENCH;
}

function validateTone(tone: string): EmailTone {
  if (Object.values(EmailTone).includes(tone as EmailTone)) {
    return tone as EmailTone;
  }
  return EmailTone.PROFESSIONAL;
}

// POST /api/compose-stream
router.post('/', async (req: Request, res: Response) => {
  try {
    const requestData: ComposeRequest = req.body;

    if (!requestData.operation) {
      return res.status(400).json({
        success: false,
        error: 'Operation is required (generate, correct, or reformulate)'
      });
    }

    const tone = validateTone(requestData.tone);
    const language = validateLanguage(requestData.language);
    const useRag = requestData.useRag ?? false;
    const userId = requestData.userId || 'anonymous';

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

    // Build appropriate prompt based on operation
    let additionalInfo = requestData.additionalInfo || '';
    let userPrompt = '';

    switch (requestData.operation) {
      case 'generate':
        if (!additionalInfo.trim()) {
          additionalInfo = 'Générer une réponse appropriée';
        }
        userPrompt = `Please generate an email based on this description: ${additionalInfo}. Return only the text of the email generated.`;
        break;

      case 'correct':
        if (!requestData.body || !requestData.body.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Email body is required for correction'
          });
        }
        additionalInfo = requestData.additionalInfo || 'Please correct grammar, spelling, punctuation, and syntax errors while preserving the original meaning and tone. Return only the text of the email corrected.';
        userPrompt = `Please correct the following email:\n\n${requestData.body}`;
        break;

      case 'reformulate':
        if (!requestData.body || !requestData.body.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Email body is required for reformulation'
          });
        }
        additionalInfo = requestData.additionalInfo || 'Make it more professional and formal';
        userPrompt = `Please reformulate the following email to improve clarity and style:\n\n${requestData.body}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Invalid operation: ${requestData.operation}`
        });
    }

    // Get RAG information if enabled
    if (useRag && userPrompt) {
      try {
        const ragResponse = await ragClient.getRelevantInfo(userPrompt, userId);
        if (ragResponse.hasResults) {
          const ragContext = ragResponse.sources
            .map((source: any, idx: number) => `\nSource ${idx + 1}: ${source.content}`)
            .join('\n');
          additionalInfo += `\n\nRelevant Information:${ragContext}`;
        }
      } catch (error) {
        console.error('RAG fetch failed:', error);
      }
    }

    // Build system prompt
    const systemPrompt = promptBuilder.buildSystemPrompt({
      tone,
      language,
      emailContext,
      additionalInfo,
      useRag
    }) + styleContext;

    // Calculate optimal token limit
    const maxTokens = calculateMaxTokens(
      requestData.operation,
      requestData.body,
      requestData.additionalInfo
    );

    console.log('🌊 Starting stream for operation:', requestData.operation);

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
      temperature: 1,
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
          metadata: {
            operation: requestData.operation,
            tone,
            language,
            model: chunk.model,
            tokensUsed: chunk.tokensUsed,
            style_analysis_used: !!styleContext
          }
        })}\n\n`);
        
        console.log('✅ Stream complete. Final text length:', fullText.length);
        
        res.end();
      }
    }
  } catch (error) {
    console.error('❌ Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
      res.end();
    }
  }
});

export default router;
