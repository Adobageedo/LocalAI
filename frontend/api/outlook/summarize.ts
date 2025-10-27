/**
 * Outlook Summarize API
 * 
 * Summarizes file attachments (PDF, DOCX, etc.) from Outlook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailPromptBuilder, SupportedLanguage } from '../config/emailConfig';
import llmClient from '../utils/llmClient';

// Request types
interface SummarizeRequest {
  authToken?: string;
  userId: string;
  file_name: string;
  file_type: string;
  file_content: string; // Base64 encoded
  language: string;
  summary_type: 'concise' | 'detailed' | 'bullet_points' | 'action_items';
  use_rag?: boolean;
}

// Response types
interface SummarizeResponse {
  summary: string;
  success: boolean;
  message?: string;
  metadata?: {
    file_name: string;
    file_type: string;
    file_size: number;
    summary_type: string;
    language: string;
    model?: string;
    tokens_used?: number;
  };
}

// Validate and normalize language
function validateLanguage(lang: string): SupportedLanguage {
  const normalized = lang.toLowerCase();
  if (Object.values(SupportedLanguage).includes(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }
  return SupportedLanguage.FRENCH;
}

/**
 * Calculate max tokens based on file size and summary type
 */
function calculateMaxTokens(summaryType: string, fileSize: number): number {
  const baseTokens = {
    'concise': 200,
    'detailed': 600,
    'bullet_points': 400,
    'action_items': 500
  };
  
  let maxTokens = baseTokens[summaryType as keyof typeof baseTokens] || 400;
  
  // Increase for larger files
  if (fileSize > 100000) maxTokens = Math.min(maxTokens * 1.5, 1000);
  
  return Math.floor(maxTokens);
}

/**
 * Extract text from base64 content based on file type
 */
function extractTextFromFile(base64Content: string, fileType: string): string {
  try {
    // Decode base64
    const buffer = Buffer.from(base64Content, 'base64');
    
    // For text files, decode directly
    if (fileType.includes('text') || fileType.includes('plain')) {
      return buffer.toString('utf-8');
    }
    
    // For PDF, DOCX, etc., we'll need to extract text
    // For now, return a placeholder - in production, use pdf-parse or mammoth
    // TODO: Implement proper text extraction for different file types
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
    return text;
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from file');
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestData: SummarizeRequest = req.body;

    // Validate required fields
    if (!requestData.file_content) {
      return res.status(400).json({
        success: false,
        error: 'File content is required'
      });
    }

    const language = validateLanguage(requestData.language || 'fr');
    const summaryType = requestData.summary_type || 'concise';
    const userId = requestData.userId || 'anonymous';

    // Extract text from file
    const fileText = extractTextFromFile(
      requestData.file_content,
      requestData.file_type
    );

    console.log(`📄 Summarizing file: ${requestData.file_name}`);
    console.log(`📏 File size: ${requestData.file_content.length} bytes`);
    console.log(`📝 Summary type: ${summaryType}`);

    // Build summary prompt based on type
    let summaryInstructions = '';
    switch (summaryType) {
      case 'concise':
        summaryInstructions = 'Provide a brief, concise summary of the main points in 2-3 sentences.';
        break;
      case 'detailed':
        summaryInstructions = 'Provide a comprehensive summary covering all key points, arguments, and conclusions.';
        break;
      case 'bullet_points':
        summaryInstructions = 'Summarize the content as a list of bullet points highlighting the main ideas.';
        break;
      case 'action_items':
        summaryInstructions = 'Extract and list all action items, tasks, deadlines, and next steps mentioned in the document.';
        break;
    }

    const languageNames = {
      [SupportedLanguage.FRENCH]: 'français',
      [SupportedLanguage.ENGLISH]: 'English',
      [SupportedLanguage.SPANISH]: 'español',
      [SupportedLanguage.GERMAN]: 'Deutsch',
      [SupportedLanguage.PORTUGUESE]: 'português',
      [SupportedLanguage.ITALIAN]: 'italiano',
      [SupportedLanguage.DUTCH]: 'Nederlands',
      [SupportedLanguage.RUSSIAN]: 'русский',
      [SupportedLanguage.JAPANESE]: '日本語',
      [SupportedLanguage.CHINESE]: '中文'
    };

    const languageName = languageNames[language] || 'français';

    // Build system prompt
    const systemPrompt = `You are an expert document summarizer. ${summaryInstructions}

Important guidelines:
- Write the summary in ${languageName}
- Be accurate and faithful to the source content
- Maintain a professional tone
- Focus on the most important information
- Keep the summary clear and well-structured

Return only the summary text, without any preamble or meta-commentary.`;

    const userPrompt = `Please summarize the following document:

File name: ${requestData.file_name}
File type: ${requestData.file_type}

Content:
${fileText.substring(0, 40000)} ${fileText.length > 40000 ? '...(truncated)' : ''}

Summary:`;

    // Calculate optimal token limit
    const maxTokens = calculateMaxTokens(summaryType, requestData.file_content.length);

    console.log(`🎯 Max tokens: ${maxTokens}`);

    // Call LLM API
    const llmResponse = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.5, // Lower temperature for more consistent summaries
      maxTokens
    });

    // Return response
    const response: SummarizeResponse = {
      summary: llmResponse.answer,
      success: true,
      message: 'File summarized successfully',
      metadata: {
        file_name: requestData.file_name,
        file_type: requestData.file_type,
        file_size: requestData.file_content.length,
        summary_type: summaryType,
        language,
        model: llmResponse.model,
        tokens_used: llmResponse.tokensUsed
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
