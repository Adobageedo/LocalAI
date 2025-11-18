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

// Response types
interface ComposeResponse {
  generated_text: string;
  success: boolean;
  message?: string;
  sources?: any[];
  metadata?: {
    tone: string;
    language: string;
    use_rag: boolean;
    model?: string;
    temperature?: number;
    style_analysis_used: boolean;
    tokens_used?: number;
  };
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
      if (inputLength < 100) {
        maxTokens = 200;
      } else if (inputLength < 300) {
        maxTokens = 400;
      } else {
        maxTokens = 600;
      }
      break;
      
    case 'correct':
      maxTokens = Math.min(Math.max(estimatedInputTokens + 50, 150), 800);
      break;
      
    case 'reformulate':
      maxTokens = Math.min(Math.max(Math.ceil(estimatedInputTokens * 1.3), 200), 1000);
      break;
      
    default:
      maxTokens = 500;
  }
  
  console.log(`📊 Token calculation: input=${inputLength} chars, estimated=${estimatedInputTokens} tokens, max=${maxTokens} tokens`);
  return maxTokens;
}

// Validate and normalize language
function validateLanguage(lang: string): SupportedLanguage {
  if (Object.values(SupportedLanguage).includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  console.warn(`Invalid language: ${lang}, defaulting to FRENCH`);
  return SupportedLanguage.FRENCH;
}

// Validate and normalize tone
function validateTone(tone: string): EmailTone {
  const lowerTone = tone.toLowerCase();
  if (Object.values(EmailTone).includes(lowerTone as EmailTone)) {
    return lowerTone as EmailTone;
  }
  console.warn(`Invalid tone: ${tone}, defaulting to PROFESSIONAL`);
  return EmailTone.PROFESSIONAL;
}

// POST /api/compose
router.post('/', async (req: Request, res: Response) => {
  try {
    const requestData: ComposeRequest = req.body;

    // Validate operation
    if (!requestData.operation) {
      return res.status(400).json({
        success: false,
        error: 'Operation is required (generate, correct, or reformulate)'
      });
    }

    // Validate tone and language
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
        additionalInfo = requestData.additionalInfo || 'Améliorer la clarté, le style et la fluidité tout en conservant le sens original.';
        userPrompt = `Please reformulate the following email to improve clarity and style:\n\n${requestData.body}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Invalid operation: ${requestData.operation}`
        });
    }

    // Get RAG information if enabled
    let ragSources: any[] = [];
    if (useRag && userPrompt) {
      try {
        const ragResponse = await ragClient.getRelevantInfo(userPrompt, userId);
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

    // Build system prompt
    const systemPrompt = promptBuilder.buildSystemPrompt({
      tone,
      language,
      emailContext,
      additionalInfo,
      useRag
    }) + styleContext;

    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);

    // Calculate optimal token limit
    const maxTokens = calculateMaxTokens(
      requestData.operation,
      requestData.body,
      requestData.additionalInfo
    );

    // Call LLM API
    const llmResponse = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 1,
      maxTokens
    });

    // Return response
    const response: ComposeResponse = {
      generated_text: llmResponse.answer,
      success: true,
      message: `Email ${requestData.operation}d successfully`,
      sources: ragSources,
      metadata: {
        tone,
        language,
        use_rag: useRag,
        model: llmResponse.model,
        temperature: llmResponse.temperature,
        style_analysis_used: !!styleContext,
        tokens_used: llmResponse.tokensUsed
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Email compose error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
