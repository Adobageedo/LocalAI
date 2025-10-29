/**
 * Attachment Domain Types
 * Types et interfaces pour les pièces jointes
 */

/**
 * Information de base sur une pièce jointe
 */
export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId?: string;
}

/**
 * Pièce jointe avec contenu extrait
 */
export interface AttachmentInfo extends Attachment {
  content?: string;
  extractionError?: string;
  extractedAt?: Date;
}

/**
 * Métadonnées d'une pièce jointe
 */
export interface AttachmentMetadata {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: 'document' | 'spreadsheet' | 'presentation' | 'image' | 'archive' | 'code' | 'other';
  sizeBytes: number;
  sizeFormatted: string;
  canExtractContent: boolean;
  icon: string;
  color: string;
}

/**
 * Résultat d'analyse de pièce jointe
 */
export interface AttachmentAnalysis {
  attachmentId: string;
  fileName: string;
  
  // Contenu extrait
  extractedText?: string;
  textLength?: number;
  
  // Analyse
  summary?: string;
  keyPoints?: string[];
  entities?: {
    dates?: string[];
    numbers?: string[];
    emails?: string[];
    urls?: string[];
  };
  
  // Métadonnées
  pageCount?: number;
  wordCount?: number;
  language?: string;
  
  // Status
  success: boolean;
  error?: string;
  analyzedAt: Date;
}

/**
 * Options d'extraction de contenu
 */
export interface ExtractionOptions {
  maxLength?: number;
  includeMetadata?: boolean;
  preserveFormatting?: boolean;
  extractImages?: boolean;
}

/**
 * Résultat d'extraction
 */
export interface ExtractionResult {
  success: boolean;
  content?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    language?: string;
  };
  error?: string;
  extractionTime?: number;
}

/**
 * Filtre pour les pièces jointes
 */
export interface AttachmentFilter {
  extensions?: string[];
  mimeTypes?: string[];
  maxSize?: number;
  categories?: string[];
}

/**
 * Statut d'upload
 */
export interface UploadStatus {
  attachmentId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Requête d'analyse de pièce jointe
 */
export interface AnalyzeAttachmentRequest {
  attachmentId: string;
  fileName: string;
  content: string;
  options?: {
    generateSummary?: boolean;
    extractEntities?: boolean;
    maxSummaryLength?: number;
  };
}

/**
 * Helper pour obtenir l'extension d'un fichier
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

/**
 * Helper pour formater la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper pour vérifier si un fichier est une image
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.webp'];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
}

/**
 * Helper pour vérifier si un fichier est un document
 */
export function isDocumentFile(filename: string): boolean {
  const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const ext = getFileExtension(filename);
  return docExtensions.includes(ext);
}

/**
 * Helper pour vérifier si le contenu peut être extrait
 */
export function canExtractContent(filename: string): boolean {
  const extractableExtensions = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    '.csv', '.xls', '.xlsx',
    '.js', '.ts', '.py', '.java', '.html', '.css', '.json', '.xml'
  ];
  const ext = getFileExtension(filename);
  return extractableExtensions.includes(ext);
}

/**
 * Helper pour obtenir la catégorie d'un fichier
 */
export function getFileCategory(filename: string): AttachmentMetadata['category'] {
  const ext = getFileExtension(filename);
  
  const categories: Record<string, AttachmentMetadata['category']> = {
    '.pdf': 'document',
    '.doc': 'document',
    '.docx': 'document',
    '.txt': 'document',
    '.rtf': 'document',
    '.odt': 'document',
    '.xls': 'spreadsheet',
    '.xlsx': 'spreadsheet',
    '.csv': 'spreadsheet',
    '.ppt': 'presentation',
    '.pptx': 'presentation',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.zip': 'archive',
    '.rar': 'archive',
    '.7z': 'archive',
    '.js': 'code',
    '.ts': 'code',
    '.py': 'code',
    '.java': 'code',
    '.html': 'code',
    '.css': 'code'
  };
  
  return categories[ext] || 'other';
}

/**
 * Helper pour créer les métadonnées d'une pièce jointe
 */
export function createAttachmentMetadata(attachment: Attachment): AttachmentMetadata {
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
    icon: getFileIcon(extension),
    color: getFileColor(category)
  };
}

/**
 * Helper pour obtenir l'icône d'un fichier
 */
function getFileIcon(extension: string): string {
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
    '.zip': 'ZipFolder',
    '.rar': 'ZipFolder'
  };
  return icons[extension] || 'Document';
}

/**
 * Helper pour obtenir la couleur d'un fichier
 */
function getFileColor(category: AttachmentMetadata['category']): string {
  const colors: Record<AttachmentMetadata['category'], string> = {
    document: '#2b579a',
    spreadsheet: '#217346',
    presentation: '#b7472a',
    image: '#0078d4',
    archive: '#737373',
    code: '#5c2d91',
    other: '#605e5c'
  };
  return colors[category];
}
