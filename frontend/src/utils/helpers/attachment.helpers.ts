/**
 * DEPRECATED: Utility functions for handling email attachments in Outlook
 * 
 * ⚠️ This file is deprecated. Use attachmentBackend.helpers.ts instead.
 * 
 * The old approach extracted text from attachments on the frontend.
 * The new approach sends attachments to the backend for processing.
 * 
 * Backend processing supports:
 * - Images (GPT Vision)
 * - Office documents (Word, Excel, PowerPoint)
 * - PDFs
 * - Text files
 * 
 * @deprecated Use attachmentBackend.helpers.ts
 */

export interface AttachmentInfo {
  name: string;
  id: string;
  content?: string;
  contentType?: string;
  size?: number;
}

/**
 * Get all attachments from the current email item
 * @returns Promise with array of attachment info
 */
export async function getEmailAttachments(): Promise<AttachmentInfo[]> {
  return new Promise((resolve, reject) => {
    if (typeof Office === 'undefined' || !Office.context || !Office.context.mailbox) {
      console.warn('Office.js not available - returning empty attachments');
      resolve([]);
      return;
    }

    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        resolve([]);
        return;
      }

      item.getAttachmentsAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('Failed to get attachments:', result.error);
          reject(result.error);
          return;
        }

        const attachments: AttachmentInfo[] = result.value.map(att => ({
          name: att.name,
          id: att.id,
          contentType: (att as any).contentType || 'application/octet-stream',
          size: att.size
        }));

        resolve(attachments);
      });
    } catch (error) {
      console.error('Error getting attachments:', error);
      reject(error);
    }
  });
}

/**
 * Get attachment content by ID
 * @param attachmentId Attachment ID from Office.js
 * @returns Promise with base64 encoded content
 */
export async function getAttachmentContent(attachmentId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof Office === 'undefined' || !Office.context || !Office.context.mailbox) {
      console.warn('Office.js not available');
      reject(new Error('Office.js not available'));
      return;
    }

    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        reject(new Error('No mail item available'));
        return;
      }

      // Get attachment content using the REST API
      item.getAttachmentContentAsync(attachmentId, (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('Failed to get attachment content:', result.error);
          reject(result.error);
          return;
        }

        // Content is in base64 format
        const content = result.value.content;
        resolve(content);
      });
    } catch (error) {
      console.error('Error getting attachment content:', error);
      reject(error);
    }
  });
}

/**
 * Decode base64 content to text (for text-based files)
 * @param base64Content Base64 encoded string
 * @returns Decoded text
 */
export function decodeBase64ToText(base64Content: string): string {
  try {
    return atob(base64Content);
  } catch (error) {
    console.error('Failed to decode base64:', error);
    return '';
  }
}

/**
 * Check if file extension is text-based and can be decoded
 * @param filename File name with extension
 * @returns true if file can be decoded to text
 */
export function isTextBasedFile(filename: string): boolean {
  const textExtensions = [
    '.txt', '.md', '.csv', '.json', '.xml', 
    '.html', '.css', '.js', '.ts', '.tsx',
    '.log', '.rtf'
  ];
  
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return textExtensions.includes(extension);
}

/**
 * Get attachments with their text content (for supported file types)
 * @returns Promise with attachments including content where possible
 * @deprecated Use getEmailAttachmentsForBackend() from attachmentBackend.helpers.ts instead
 */
export async function getAttachmentsWithContent(): Promise<AttachmentInfo[]> {
  try {
    const attachments = await getEmailAttachments();
    
    // Fetch content for text-based files
    const attachmentsWithContent = await Promise.all(
      attachments.map(async (att) => {
        if (isTextBasedFile(att.name) && att.size && att.size < 1024 * 1024) { // Max 1MB
          try {
            const base64Content = await getAttachmentContent(att.id);
            const textContent = decodeBase64ToText(base64Content);
            return {
              ...att,
              content: textContent
            };
          } catch (error) {
            console.warn(`Failed to get content for ${att.name}:`, error);
            return att;
          }
        }
        return att;
      })
    );

    return attachmentsWithContent;
  } catch (error) {
    console.error('Error getting attachments with content:', error);
    return [];
  }
}
