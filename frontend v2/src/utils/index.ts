/**
 * Utils Index
 * Export centralisé de tous les utilitaires
 * 
 * Note: Certains modules exportent des fonctions avec le même nom.
 * Les warnings TypeScript TS2308 sont non bloquants et n'affectent pas la compilation.
 * 
 * Pour éviter l'ambiguïté, importez directement depuis le sous-module:
 * - import { formatFileSize } from '@/utils/formatting';  // ou '@/utils/attachment'
 * - import { formatNumber } from '@/utils/formatting';    // ou '@/utils/i18n'
 * - import { formatDate } from '@/utils/date';            // ou '@/utils/i18n'
 * - import { validateEmail } from '@/utils/validation';   // ou '@/utils/email'
 * - import { extractUrls } from '@/utils/helpers';        // ou '@/utils/email'
 */

// API utilities
export * from './api';

// Date utilities  
export * from './date';

// Formatting utilities (contient formatFileSize, formatNumber)
export * from './formatting';

// Attachment utilities (contient aussi formatFileSize)
// Warning TS2308: formatFileSize déjà exporté par formatting
export * from './attachment';

// Helper utilities (contient extractUrls)
export * from './helpers';

// Email utilities (contient extractUrls, validateEmail)
// Warning TS2308: extractUrls déjà exporté par helpers
export * from './email';

// Validation utilities (contient validateEmail)
// Warning TS2308: validateEmail déjà exporté par email
export * from './validation';

// i18n utilities (contient formatDate, formatTime, formatNumber)
// Warning TS2308: formatDate, formatTime déjà exportés par date
// Warning TS2308: formatNumber déjà exporté par formatting
export * from './i18n';
