/**
 * Attachment Backend Helpers
 * Utilities for preparing attachments to send to backend for processing
 */

import type { Attachment } from '../../services/api/llmService';
// Heuristics to filter out signature images and unwanted inline-like assets
function isLikelySignatureAttachment(att: any): boolean {
  try {
    const name = String(att?.name || '').toLowerCase();
    const contentType = String(att?.contentType || '').toLowerCase();
    const size = Number(att?.size || 0);

    // Common signature/branding names
    const signatureNamePattern = /(image00\d|logo|signature|sign|sig|avatar|smime|badge|icon|spacer|pixel)/i;

    // Very small images (default 25KB threshold)
    const isSmallImage = contentType.startsWith('image/') && size > 0 && size < 25 * 1024;

    // SMIME signatures or certificates
    const isSmime = contentType.includes('pkcs7') || name.endsWith('.p7s') || name.includes('smime');

    return signatureNamePattern.test(name) || isSmallImage || isSmime;
  } catch {
    return false;
  }
}

/**
 * Get attachment content as base64 from Office.js
 */
export async function getAttachmentContent(attachmentId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!Office?.context?.mailbox?.item) {
      reject(new Error('Office context not available'));
      return;
    }


    Office.context.mailbox.item.getAttachmentContentAsync(
      attachmentId,
      (result: Office.AsyncResult<Office.AttachmentContent>) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value.content);
        } else {
          reject(new Error(result.error?.message || 'Failed to get attachment'));
        }
      }
    );
  });
}

/**
 * Get all email attachments with their content as base64
 */
export async function getEmailAttachmentsForBackend(): Promise<Attachment[]> {
  try {
    if (!Office?.context?.mailbox?.item?.attachments) {
      return [];
    }

    const attachments = Office.context.mailbox.item.attachments;

    // Filter out inline attachments (embedded images in email body)
    const fileAttachments = attachments
      .filter(att => att.attachmentType === Office.MailboxEnums.AttachmentType.File)
      .filter(att => !isLikelySignatureAttachment(att));

    // Get content for each attachment
    const attachmentPromises = fileAttachments.map(async (att) => {
      try {
        const content = await getAttachmentContent(att.id);
        
        return {
          filename: att.name,
          content: content,  // Already base64
          mime_type: att.contentType,
          size: att.size
        } as Attachment;
      } catch (error) {
        console.error(`Failed to get content for ${att.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(attachmentPromises);
    
    // Filter out failed attachments
    const finalResults = results.filter((att): att is Attachment => att !== null);
    return finalResults;
  } catch (error) {
    console.error('Error getting email attachments:', error);
    return [];
  }
}

/**
 * Check if email has any file attachments
 */
export function hasEmailAttachments(): boolean {
  try {
    if (!Office?.context?.mailbox?.item?.attachments) {
      return false;
    }

    const fileAttachments = Office.context.mailbox.item.attachments
      .filter(att => att.attachmentType === Office.MailboxEnums.AttachmentType.File)
      .filter(att => !isLikelySignatureAttachment(att));

    return fileAttachments.length > 0;
  } catch (error) {
    console.error('Error checking attachments:', error);
    return false;
  }
}

/**
 * Get attachment count
 */
export function getAttachmentCount(): number {
  try {
    if (!Office?.context?.mailbox?.item?.attachments) {
      return 0;
    }

    const fileAttachments = Office.context.mailbox.item.attachments
      .filter(att => att.attachmentType === Office.MailboxEnums.AttachmentType.File)
      .filter(att => !isLikelySignatureAttachment(att));

    return fileAttachments.length;
  } catch (error) {
    console.error('Error getting attachment count:', error);
    return 0;
  }
}

/**
 * Get attachment info without content (for display purposes)
 */
export interface AttachmentInfo {
  name: string;
  size?: number;
  contentType?: string;
  isImage: boolean;
  isDocument: boolean;
}

export function getAttachmentInfo(): AttachmentInfo[] {
  try {
    if (!Office?.context?.mailbox?.item?.attachments) {
      return [];
    }

    const fileAttachments = Office.context.mailbox.item.attachments
      .filter(att => att.attachmentType === Office.MailboxEnums.AttachmentType.File)
      .filter(att => !isLikelySignatureAttachment(att));


    const info = fileAttachments.map(att => {
      const extension = att.name.substring(att.name.lastIndexOf('.')).toLowerCase();
      
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const documentExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.txt', '.csv'];
      
      return {
        name: att.name,
        size: att.size,
        contentType: att.contentType,
        isImage: imageExtensions.includes(extension),
        isDocument: documentExtensions.includes(extension)
      };
    });
    
    return info;
  } catch (error) {
    console.error('Error getting attachment info:', error);
    return [];
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
