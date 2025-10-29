/**
 * File Types Configuration
 * Configuration des types de fichiers supportés pour les pièces jointes
 */

/**
 * Configuration des types de fichiers supportés
 */
export const SUPPORTED_FILE_TYPES = {
  // Documents
  DOCUMENTS: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    category: 'document',
    icon: 'TextDocument'
  },

  // Feuilles de calcul
  SPREADSHEETS: {
    extensions: ['.xls', '.xlsx', '.csv', '.ods'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    category: 'spreadsheet',
    icon: 'ExcelDocument'
  },

  // Présentations
  PRESENTATIONS: {
    extensions: ['.ppt', '.pptx', '.odp'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'presentation',
    icon: 'PowerPointDocument'
  },

  // Images
  IMAGES: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.webp'],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/bmp',
      'image/webp'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    category: 'image',
    icon: 'Photo2'
  },

  // Archives
  ARCHIVES: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip'
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'archive',
    icon: 'ZipFolder'
  },

  // Code
  CODE: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.cs', '.html', '.css', '.json', '.xml'],
    mimeTypes: [
      'text/javascript',
      'application/typescript',
      'text/x-python',
      'text/x-java-source',
      'text/x-c++src',
      'text/x-csharp',
      'text/html',
      'text/css',
      'application/json',
      'application/xml'
    ],
    maxSize: 2 * 1024 * 1024, // 2MB
    category: 'code',
    icon: 'Code'
  }
};

/**
 * Icônes par extension de fichier
 */
export const FILE_ICONS = {
  // Documents
  '.pdf': 'PDF',
  '.doc': 'WordDocument',
  '.docx': 'WordDocument',
  '.txt': 'TextDocument',
  '.rtf': 'TextDocument',
  '.odt': 'TextDocument',

  // Feuilles de calcul
  '.xls': 'ExcelDocument',
  '.xlsx': 'ExcelDocument',
  '.csv': 'Table',
  '.ods': 'ExcelDocument',

  // Présentations
  '.ppt': 'PowerPointDocument',
  '.pptx': 'PowerPointDocument',
  '.odp': 'PowerPointDocument',

  // Images
  '.jpg': 'Photo2',
  '.jpeg': 'Photo2',
  '.png': 'Photo2',
  '.gif': 'Photo2',
  '.svg': 'Photo2',
  '.bmp': 'Photo2',
  '.webp': 'Photo2',

  // Archives
  '.zip': 'ZipFolder',
  '.rar': 'ZipFolder',
  '.7z': 'ZipFolder',
  '.tar': 'ZipFolder',
  '.gz': 'ZipFolder',

  // Code
  '.js': 'Code',
  '.ts': 'Code',
  '.jsx': 'Code',
  '.tsx': 'Code',
  '.py': 'Code',
  '.java': 'Code',
  '.cpp': 'Code',
  '.cs': 'Code',
  '.html': 'Code',
  '.css': 'Code',
  '.json': 'Code',
  '.xml': 'Code',

  // Par défaut
  'default': 'Document'
} as const;

/**
 * Couleurs par catégorie de fichier
 */
export const FILE_CATEGORY_COLORS = {
  document: '#2b579a',
  spreadsheet: '#217346',
  presentation: '#b7472a',
  image: '#0078d4',
  archive: '#737373',
  code: '#5c2d91',
  default: '#605e5c'
} as const;

/**
 * Obtenir toutes les extensions supportées
 */
export function getAllSupportedExtensions(): string[] {
  const extensions: string[] = [];
  Object.values(SUPPORTED_FILE_TYPES).forEach(type => {
    extensions.push(...type.extensions);
  });
  return extensions;
}

/**
 * Obtenir tous les mime types supportés
 */
export function getAllSupportedMimeTypes(): string[] {
  const mimeTypes: string[] = [];
  Object.values(SUPPORTED_FILE_TYPES).forEach(type => {
    mimeTypes.push(...type.mimeTypes);
  });
  return mimeTypes;
}

/**
 * Vérifier si une extension est supportée
 */
export function isExtensionSupported(extension: string): boolean {
  const normalizedExt = extension.toLowerCase();
  return getAllSupportedExtensions().includes(normalizedExt);
}

/**
 * Vérifier si un mime type est supporté
 */
export function isMimeTypeSupported(mimeType: string): boolean {
  return getAllSupportedMimeTypes().includes(mimeType.toLowerCase());
}

/**
 * Obtenir la catégorie d'un fichier par son extension
 */
export function getFileCategoryByExtension(extension: string): string {
  const normalizedExt = extension.toLowerCase();
  for (const [, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return config.category;
    }
  }
  return 'default';
}

/**
 * Obtenir la catégorie d'un fichier par son mime type
 */
export function getFileCategoryByMimeType(mimeType: string): string {
  const normalizedMime = mimeType.toLowerCase();
  for (const [, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.mimeTypes.includes(normalizedMime)) {
      return config.category;
    }
  }
  return 'default';
}

/**
 * Obtenir l'icône d'un fichier par son extension
 */
export function getFileIcon(extension: string): string {
  const normalizedExt = extension.toLowerCase();
  return FILE_ICONS[normalizedExt as keyof typeof FILE_ICONS] || FILE_ICONS.default;
}

/**
 * Obtenir la couleur d'un fichier par sa catégorie
 */
export function getFileColor(category: string): string {
  return FILE_CATEGORY_COLORS[category as keyof typeof FILE_CATEGORY_COLORS] || FILE_CATEGORY_COLORS.default;
}

/**
 * Obtenir la taille max pour une extension
 */
export function getMaxFileSize(extension: string): number {
  const normalizedExt = extension.toLowerCase();
  for (const [, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return config.maxSize;
    }
  }
  return 10 * 1024 * 1024; // 10MB par défaut
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
 * Extraire l'extension d'un nom de fichier
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

/**
 * Vérifier si un fichier est une image
 */
export function isImageFile(extension: string): boolean {
  return SUPPORTED_FILE_TYPES.IMAGES.extensions.includes(extension.toLowerCase());
}

/**
 * Vérifier si un fichier est un document
 */
export function isDocumentFile(extension: string): boolean {
  return SUPPORTED_FILE_TYPES.DOCUMENTS.extensions.includes(extension.toLowerCase());
}

/**
 * Vérifier si le contenu d'un fichier peut être extrait
 */
export function canExtractContent(extension: string): boolean {
  const extractableExtensions = [
    ...SUPPORTED_FILE_TYPES.DOCUMENTS.extensions,
    ...SUPPORTED_FILE_TYPES.CODE.extensions,
    '.csv', '.txt'
  ];
  return extractableExtensions.includes(extension.toLowerCase());
}
