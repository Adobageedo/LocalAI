/**
 * Attachment Processing Utilities
 * Shared functions for processing attachments (PDF, DOCX, images, text files)
 * Used by Vercel API and potentially other services
 */

/**
 * Extract text from PDF using pdf-parse (dynamic import)
 */
export async function extractPdfText(b64: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse').catch(() => null as any);
    if (!pdfParse) {
      console.warn('ℹ️ [attachmentProcessor] pdf-parse not installed, skipping PDF extraction');
      return '';
    }
    const buffer = Buffer.from(b64, 'base64');
    const res: any = await (pdfParse as any).default(buffer);
    return (res && res.text) ? String(res.text) : '';
  } catch (err) {
    console.warn('⚠️ [attachmentProcessor] PDF extraction failed:', err);
    return '';
  }
}

/**
 * Convert PDF (base64) to PNG base64 images using pdf2pic (dynamic import)
 * Returns array of base64 PNG strings (without data URL prefix)
 */
export async function convertPdfToPngBase64(b64: string, maxPages: number = 1): Promise<string[]> {
  try {
    const pdf2pic = await import('pdf2pic').catch(() => null as any);
    if (!pdf2pic) {
      console.warn('ℹ️ [attachmentProcessor] pdf2pic not installed, skipping PDF->image conversion');
      return [];
    }
    const { fromBuffer } = (pdf2pic as any);
    const buffer = Buffer.from(b64, 'base64');
    const options = {
      density: 200,
      format: 'png',
      width: 1600,
      height: 1600,
      savePath: undefined,
    };
    const convert = fromBuffer(buffer, options);
    
    const results: string[] = [];
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const result = await convert(pageNum, { responseType: 'base64' }).catch(() => null as any);
      if (result?.base64) {
        const base64 = String(result.base64).replace(/\s/g, '');
        results.push(base64);
        console.log(`✅ [attachmentProcessor] PDF->image conversion succeeded (page ${pageNum})`);
      }
    }
    
    if (results.length === 0) {
      console.warn('⚠️ [attachmentProcessor] PDF->image conversion returned no base64');
    }
    
    return results;
  } catch (err) {
    console.warn('⚠️ [attachmentProcessor] PDF->image conversion failed:', (err as any)?.message || err);
    return [];
  }
}

/**
 * Extract text from DOCX using mammoth (dynamic import)
 */
export async function extractDocxText(b64: string): Promise<string> {
  try {
    const mammoth = await import('mammoth').catch(() => null as any);
    if (!mammoth) {
      console.warn('ℹ️ [attachmentProcessor] mammoth not installed, skipping DOCX extraction');
      return '';
    }
    const buffer = Buffer.from(b64, 'base64');
    const result: any = await (mammoth as any).extractRawText({ buffer });
    return (result && result.value) ? String(result.value) : '';
  } catch (err) {
    console.warn('⚠️ [attachmentProcessor] DOCX extraction failed:', err);
    return '';
  }
}

/**
 * Check if file is text-based by extension or MIME type
 */
export function isTextBased(filename?: string, mime?: string): boolean {
  const ext = (filename || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  const textExts = ['.txt', '.md', '.csv', '.json', '.xml', '.log', '.rtf'];
  const textMimes = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/xml'];
  return textExts.some(e => ext.endsWith(e)) || textMimes.includes(m);
}

/**
 * Check if file is an image by extension or MIME type
 */
export function isImage(filename?: string, mime?: string): boolean {
  const ext = (filename || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return imageExts.some(e => ext.endsWith(e)) || m.startsWith('image/');
}

/**
 * Decode base64 to UTF-8 string
 */
export function base64ToUtf8(b64: string): string {
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    console.warn('⚠️ [attachmentProcessor] Failed to decode base64 to UTF-8');
    return '';
  }
}

/**
 * Process attachments and return text content and image URLs
 * @param attachments Array of attachments with base64 content
 * @returns Object with textParts (for system context) and imageDataUrls (for Vision)
 */
export async function processAttachments(
  attachments: Array<{ filename: string; content: string; mime_type?: string; size?: number }>
): Promise<{ textParts: string[]; imageDataUrls: string[] }> {
  const textParts: string[] = [];
  const imageDataUrls: string[] = [];

  console.log(`🔄 [attachmentProcessor] Processing ${attachments.length} attachment(s)...`);

  for (const att of attachments) {
    const fname = att.filename || 'unknown-file';
    const mime = att.mime_type || '';

    if (isTextBased(fname, mime)) {
      const decoded = base64ToUtf8(att.content || '');
      if (decoded) {
        textParts.push(`\n--- Content from ${fname} ---\n${decoded}`);
        console.log(`📄 [attachmentProcessor] Added text from ${fname} (${decoded.length} chars)`);
      } else {
        console.log(`⚠️ [attachmentProcessor] Empty/undecodable text for ${fname}`);
      }
    } else if (fname.toLowerCase().endsWith('.pdf') || mime === 'application/pdf') {
      const pdfText = await extractPdfText(att.content || '');
      if (pdfText) {
        textParts.push(`\n--- Content from ${fname} (PDF) ---\n${pdfText}`);
        console.log(`📄 [attachmentProcessor] Extracted PDF text from ${fname} (${pdfText.length} chars)`);
      } else {
        console.log(`ℹ️ [attachmentProcessor] PDF had no extractable text: ${fname}. Trying PDF->image conversion...`);
        const images = await convertPdfToPngBase64(att.content || '');
        if (images.length > 0) {
          for (const img of images) {
            imageDataUrls.push(`data:image/png;base64,${img}`);
          }
          console.log(`✅ [attachmentProcessor] Attached ${images.length} image(s) converted from PDF`);
        } else {
          console.log(`ℹ️ [attachmentProcessor] PDF->image conversion not available/failed for ${fname}`);
          textParts.push(`\n--- Attachment notice ---\nA PDF named "${fname}" was attached but could not be rendered as an image for Vision. Consider providing a renderable image or a text-based version.`);
        }
      }
    } else if (fname.toLowerCase().endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docxText = await extractDocxText(att.content || '');
      if (docxText) {
        textParts.push(`\n--- Content from ${fname} (DOCX) ---\n${docxText}`);
        console.log(`📄 [attachmentProcessor] Extracted DOCX text from ${fname} (${docxText.length} chars)`);
      } else {
        console.log(`ℹ️ [attachmentProcessor] DOCX had no extractable text: ${fname}`);
      }
    } else if (isImage(fname, mime)) {
      const dataUrl = `data:${mime || 'image/jpeg'};base64,${att.content}`;
      imageDataUrls.push(dataUrl);
      console.log(`🖼️ [attachmentProcessor] Prepared image for GPT-Vision: ${fname}`);
    } else {
      console.log(`ℹ️ [attachmentProcessor] Unsupported file type for inline processing: ${fname} (${mime}). Skipping extraction.`);
    }
  }

  console.log(`✅ [attachmentProcessor] Processing complete: ${textParts.length} text part(s), ${imageDataUrls.length} image(s)`);
  return { textParts, imageDataUrls };
}
