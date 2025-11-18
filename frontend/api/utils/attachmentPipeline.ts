import { ChatMessage } from './llmClient';
import {
  isTextBased,
  isImage,
  base64ToUtf8,
  extractPdfText,
  extractDocxText,
  convertPdfToPngBase64,
} from './attachmentUtils';

export interface Attachment {
  filename: string;
  content: string; // base64
  mime_type?: string;
  size?: number;
}

interface ProcessParams {
  attachments: Attachment[];
  conversationMessages: ChatMessage[];
  systemPrompt?: string;
  defaultUserStyle: string;
  model: string;
}

interface ProcessResult {
  conversationMessages: ChatMessage[];
  modelToUse: string;
}

// Processes attachments: injects text into system message and images into last user message for Vision
export async function processAttachments(params: ProcessParams): Promise<ProcessResult> {
  const { attachments, systemPrompt, defaultUserStyle, model } = params;
  let { conversationMessages } = params;
  let modelToUse = model;

  console.log('🔄 [Vercel promptLLM] Processing attachments on Node side...');

  const textParts: string[] = [];
  const imageDataUrls: string[] = [];

  for (const att of attachments) {
    const fname = att.filename || 'unknown-file';
    const mime = att.mime_type || '';

    if (isTextBased(fname, mime)) {
      const decoded = base64ToUtf8(att.content || '');
      if (decoded) {
        textParts.push(`\n--- Content from ${fname} ---\n${decoded}`);
        console.log(`📄 [Vercel promptLLM] Added text from ${fname} (${decoded.length} chars)`);
      } else {
        console.log(`⚠️ [Vercel promptLLM] Empty/undecodable text for ${fname}`);
      }
    } else if (fname.toLowerCase().endsWith('.pdf') || mime === 'application/pdf') {
      const pdfText = await extractPdfText(att.content || '');
      if (pdfText) {
        textParts.push(`\n--- Content from ${fname} (PDF) ---\n${pdfText}`);
        console.log(`📄 [Vercel promptLLM] Extracted PDF text from ${fname} (${pdfText.length} chars)`);
      } else {
        console.log(`ℹ️ [Vercel promptLLM] PDF had no extractable text: ${fname}. Trying PDF->image conversion...`);
        const images = await convertPdfToPngBase64(att.content || '');
        if (images.length > 0) {
          for (const img of images) {
            imageDataUrls.push(`data:image/png;base64,${img}`);
          }
          console.log(`✅ [Vercel promptLLM] Attached ${images.length} image(s) converted from PDF`);
        } else {
          console.log(`ℹ️ [Vercel promptLLM] PDF->image conversion not available/failed for ${fname}`);
          textParts.push(`\n--- Attachment notice ---\nA PDF named "${fname}" was attached but could not be rendered as an image for Vision. Consider providing a renderable image or a text-based version.`);
        }
      }
    } else if (fname.toLowerCase().endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docxText = await extractDocxText(att.content || '');
      if (docxText) {
        textParts.push(`\n--- Content from ${fname} (DOCX) ---\n${docxText}`);
        console.log(`📄 [Vercel promptLLM] Extracted DOCX text from ${fname} (${docxText.length} chars)`);
      } else {
        console.log(`ℹ️ [Vercel promptLLM] DOCX had no extractable text: ${fname}`);
      }
    } else if (isImage(fname, mime)) {
      const dataUrl = `data:${mime || 'image/jpeg'};base64,${att.content}`;
      imageDataUrls.push(dataUrl);
      console.log(`🖼️ [Vercel promptLLM] Prepared image for GPT-Vision: ${fname}`);
    } else {
      console.log(`ℹ️ [Vercel promptLLM] Unsupported file type for inline processing: ${fname} (${mime}). Skipping extraction.`);
    }
  }

  // Inject text parts into system message (prepend or create one)
  if (textParts.length > 0) {
    const contextText = `\n\n## Attached Documents:\n${textParts.join('\n')}`;
    const sysIdx = conversationMessages.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      const original = typeof conversationMessages[sysIdx].content === 'string' ? (conversationMessages[sysIdx].content as string) : '';
      conversationMessages[sysIdx] = {
        role: 'system',
        content: `${original}${contextText}`,
      } as ChatMessage;
    } else {
      conversationMessages.unshift({ role: 'system', content: (systemPrompt || '') + defaultUserStyle + contextText } as ChatMessage);
    }
    console.log(`✅ [Vercel promptLLM] Injected ${textParts.length} text file(s) into system context`);
  }

  // Attach images to the last user message as multimodal for GPT-Vision
  if (imageDataUrls.length > 0) {
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      if (conversationMessages[i].role === 'user') {
        const currentContent = conversationMessages[i].content;
        const multimodal: any[] = [
          { type: 'text', text: typeof currentContent === 'string' ? (currentContent as string) : JSON.stringify(currentContent) },
          ...imageDataUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'high' } }))
        ];
        (conversationMessages[i] as any).content = multimodal;
        console.log(`✅ [Vercel promptLLM] Attached ${imageDataUrls.length} image(s) to last user message for GPT-Vision`);
        break;
      }
    }

    // Ensure a Vision-capable model (only if we actually attached images)
    if (!String(modelToUse).includes('gpt-4')) {
      console.log(`🔄 [Vercel promptLLM] Switching model to gpt-4o for Vision support`);
      modelToUse = 'gpt-4o';
    }
  }

  return { conversationMessages, modelToUse };
}
