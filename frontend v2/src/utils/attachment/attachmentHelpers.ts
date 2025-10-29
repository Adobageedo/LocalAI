/**
 * Attachment Helpers
 * Utilitaires pour gérer les pièces jointes
 * Migré et amélioré depuis /frontend/src/utils/attachmentHelpers.ts
 */

import { AttachmentInfo } from '@/models/domain';
import { SUPPORTED_FILE_TYPES } from '@/config/fileTypes';

/**
 * Obtenir les pièces jointes avec leur contenu depuis Outlook
 */
export async function getAttachmentsWithContent(): Promise<AttachmentInfo[]> {
  try {
    if (!Office.context?.mailbox?.item) {
      return [];
    }
    
    const item = Office.context.mailbox.item;
    if (!item.attachments) {
      return [];
    }

    const attachments: AttachmentInfo[] = [];
    
    for (const attachment of item.attachments) {
      try {
        const attachmentInfo: AttachmentInfo = {
          id: attachment.id,
          name: attachment.name,
          contentType: attachment.contentType || '',
          size: attachment.size,
          isInline: attachment.isInline || false
        };

        // Essayer d'extraire le contenu si possible
        if (canExtractContent(attachment.name)) {
          const content = await getAttachmentContent(attachment.id);
          if (content) {
            attachmentInfo.content = content;
            attachmentInfo.extractedAt = new Date();
          }
        }

        attachments.push(attachmentInfo);
      } catch (error) {
        console.error(`Error processing attachment ${attachment.name}:`, error);
        // Ajouter l'attachment sans contenu en cas d'erreur
        attachments.push({
          id: attachment.id,
          name: attachment.name,
          contentType: attachment.contentType || '',
          size: attachment.size,
          isInline: attachment.isInline || false,
          extractionError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return attachments;
  } catch (error) {
    console.error('Error getting attachments:', error);
    return [];
  }
}

/**
 * Obtenir le contenu d'une pièce jointe
 */
async function getAttachmentContent(attachmentId: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!Office.context?.mailbox?.item) {
      resolve(undefined);
      return;
    }
    
    const item = Office.context.mailbox.item;

    item.getAttachmentContentAsync(attachmentId, (result: any) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        try {
          const content = result.value.content;
          // Décoder le base64 si nécessaire
          const decoded = atob(content);
          resolve(decoded);
        } catch (error) {
          console.error('Error decoding attachment content:', error);
          resolve(undefined);
        }
      } else {
        console.error('Error getting attachment content:', result.error);
        resolve(undefined);
      }
    });
  });
}

/**
 * Vérifier si le contenu peut être extrait
 */
export function canExtractContent(filename: string): boolean {
  const extension = getFileExtension(filename);
  const extractableExtensions = [
    ...SUPPORTED_FILE_TYPES.DOCUMENTS.extensions,
    ...SUPPORTED_FILE_TYPES.CODE.extensions,
    '.csv', '.txt'
  ];
  return extractableExtensions.includes(extension);
}

/**
 * Filtrer les pièces jointes par extension
 */
export function filterAttachmentsByExtension(
  attachments?: AttachmentInfo[],
  allowedExtensions?: string[]
): AttachmentInfo[] {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  if (!allowedExtensions || allowedExtensions.length === 0) {
    // Si pas d'extensions spécifiées, utiliser toutes les extensions supportées
    const allExtensions = Object.values(SUPPORTED_FILE_TYPES)
      .flatMap(type => type.extensions);
    return attachments.filter(att => 
      allExtensions.includes(getFileExtension(att.name))
    );
  }

  return attachments.filter(att => 
    allowedExtensions.includes(getFileExtension(att.name))
  );
}

/**
 * Obtenir l'extension d'un fichier
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

/**
 * Obtenir l'icône d'un fichier
 */
export function getFileIcon(filename: string): string {
  const extension = getFileExtension(filename);
  const icons: Record<string, string> = {
    '.pdf': 'PDF',
    '.doc': 'WordDocument',
    '.docx': 'WordDocument',
    '.xls': 'ExcelDocument',
    '.xlsx': 'ExcelDocument',
    '.ppt': 'PowerPointDocument',
    '.pptx': 'PowerPointDocument',
    '.txt': 'TextDocument',
    '.jpg': 'Photo2',
    '.jpeg': 'Photo2',
    '.png': 'Photo2',
    '.gif': 'Photo2',
    '.zip': 'ZipFolder',
    '.rar': 'ZipFolder'
  };
  return icons[extension] || 'Document';
}

/**
 * Formater la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Vérifier si un fichier est une image
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.webp'];
  return imageExtensions.includes(getFileExtension(filename));
}

/**
 * Vérifier si un fichier est un document
 */
export function isDocumentFile(filename: string): boolean {
  const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  return docExtensions.includes(getFileExtension(filename));
}

/**
 * Obtenir les métadonnées d'une pièce jointe
 */
export function getAttachmentMetadata(attachment: AttachmentInfo) {
  const extension = getFileExtension(attachment.name);
  const category = getFileCategory(attachment.name);
  
  return {
    id: attachment.id,
    name: attachment.name,
    extension,
    mimeType: attachment.contentType,
    category,
    sizeBytes: attachment.size,
    sizeFormatted: formatFileSize(attachment.size),
    canExtractContent: canExtractContent(attachment.name),
    icon: getFileIcon(attachment.name),
    color: getFileColor(category)
  };
}

/**
 * Obtenir la catégorie d'un fichier
 */
function getFileCategory(filename: string): string {
  const ext = getFileExtension(filename);
  
  if (SUPPORTED_FILE_TYPES.DOCUMENTS.extensions.includes(ext)) return 'document';
  if (SUPPORTED_FILE_TYPES.SPREADSHEETS.extensions.includes(ext)) return 'spreadsheet';
  if (SUPPORTED_FILE_TYPES.PRESENTATIONS.extensions.includes(ext)) return 'presentation';
  if (SUPPORTED_FILE_TYPES.IMAGES.extensions.includes(ext)) return 'image';
  if (SUPPORTED_FILE_TYPES.ARCHIVES.extensions.includes(ext)) return 'archive';
  if (SUPPORTED_FILE_TYPES.CODE.extensions.includes(ext)) return 'code';
  
  return 'other';
}

/**
 * Obtenir la couleur d'un fichier
 */
function getFileColor(category: string): string {
  const colors: Record<string, string> = {
    document: '#2b579a',
    spreadsheet: '#217346',
    presentation: '#b7472a',
    image: '#0078d4',
    archive: '#737373',
    code: '#5c2d91',
    other: '#605e5c'
  };
  return colors[category] || colors.other;
}

/**
 * Valider une pièce jointe
 */
export function validateAttachment(attachment: AttachmentInfo): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const extension = getFileExtension(attachment.name);
  
  // Vérifier l'extension
  const allExtensions = Object.values(SUPPORTED_FILE_TYPES)
    .flatMap(type => type.extensions);
  
  if (!allExtensions.includes(extension)) {
    errors.push(`Type de fichier non supporté: ${extension}`);
  }
  
  // Vérifier la taille
  const maxSize = getMaxFileSize(extension);
  if (attachment.size > maxSize) {
    errors.push(`Fichier trop volumineux (max: ${formatFileSize(maxSize)})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Obtenir la taille max pour un type de fichier
 */
function getMaxFileSize(extension: string): number {
  for (const [, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(extension)) {
      return config.maxSize;
    }
  }
  return 10 * 1024 * 1024; // 10MB par défaut
}

/**
 * Créer un résumé des pièces jointes
 */
export function createAttachmentsSummary(attachments: AttachmentInfo[]): string {
  if (attachments.length === 0) {
    return 'Aucune pièce jointe';
  }
  
  const summary = attachments.map(att => {
    const size = formatFileSize(att.size);
    return `- ${att.name} (${size})`;
  }).join('\n');
  
  return `${attachments.length} pièce(s) jointe(s):\n${summary}`;
}
