/**
 * Validation Utilities
 * Fonctions de validation génériques
 */

import { VALIDATION_REGEX } from '@/config/constants';

/**
 * Valider un email
 */
export function validateEmail(email: string): boolean {
  return VALIDATION_REGEX.EMAIL.test(email);
}

/**
 * Valider un mot de passe
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valider un numéro de téléphone
 */
export function validatePhone(phone: string): boolean {
  return VALIDATION_REGEX.PHONE.test(phone);
}

/**
 * Valider une URL
 */
export function validateUrl(url: string): boolean {
  return VALIDATION_REGEX.URL.test(url);
}

/**
 * Valider une chaîne alphanumérique
 */
export function validateAlphanumeric(value: string): boolean {
  return VALIDATION_REGEX.ALPHANUMERIC.test(value);
}

/**
 * Valider une chaîne numérique
 */
export function validateNumeric(value: string): boolean {
  return VALIDATION_REGEX.NUMERIC.test(value);
}

/**
 * Valider une longueur de chaîne
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number
): {
  isValid: boolean;
  error?: string;
} {
  const length = value.length;
  
  if (min !== undefined && length < min) {
    return {
      isValid: false,
      error: `Minimum ${min} caractères requis`
    };
  }
  
  if (max !== undefined && length > max) {
    return {
      isValid: false,
      error: `Maximum ${max} caractères autorisés`
    };
  }
  
  return { isValid: true };
}

/**
 * Valider un champ requis
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * Valider un nombre dans une plage
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number
): {
  isValid: boolean;
  error?: string;
} {
  if (min !== undefined && value < min) {
    return {
      isValid: false,
      error: `La valeur doit être au moins ${min}`
    };
  }
  
  if (max !== undefined && value > max) {
    return {
      isValid: false,
      error: `La valeur doit être au maximum ${max}`
    };
  }
  
  return { isValid: true };
}

/**
 * Valider une date
 */
export function validateDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Valider une date future
 */
export function validateFutureDate(date: Date | string): boolean {
  if (!validateDate(date)) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Valider une date passée
 */
export function validatePastDate(date: Date | string): boolean {
  if (!validateDate(date)) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Valider un fichier
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Vérifier la taille
  if (options?.maxSize && file.size > options.maxSize) {
    errors.push(`Fichier trop volumineux (max: ${formatBytes(options.maxSize)})`);
  }
  
  // Vérifier le type MIME
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`Type de fichier non autorisé: ${file.type}`);
  }
  
  // Vérifier l'extension
  if (options?.allowedExtensions) {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!options.allowedExtensions.includes(extension)) {
      errors.push(`Extension non autorisée: ${extension}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valider une correspondance de mots de passe
 */
export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

/**
 * Valider un formulaire complet
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, ValidationRule[]>
): {
  isValid: boolean;
  errors: Record<keyof T, string[]>;
} {
  const errors: any = {};
  let isValid = true;
  
  Object.keys(rules).forEach((key) => {
    const field = key as keyof T;
    const fieldRules = rules[field];
    const value = data[field];
    const fieldErrors: string[] = [];
    
    fieldRules.forEach(rule => {
      const result = rule.validator(value);
      if (!result) {
        fieldErrors.push(rule.message);
        isValid = false;
      }
    });
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });
  
  return { isValid, errors };
}

/**
 * Type pour les règles de validation
 */
export interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

/**
 * Helper pour formater les bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Créer une règle de validation personnalisée
 */
export function createRule(
  validator: (value: any) => boolean,
  message: string
): ValidationRule {
  return { validator, message };
}

/**
 * Règles de validation communes pré-définies
 */
export const commonRules = {
  required: createRule(validateRequired, 'Ce champ est requis'),
  email: createRule(validateEmail, 'Email invalide'),
  phone: createRule(validatePhone, 'Numéro de téléphone invalide'),
  url: createRule(validateUrl, 'URL invalide'),
  alphanumeric: createRule(validateAlphanumeric, 'Caractères alphanumériques uniquement'),
  numeric: createRule(validateNumeric, 'Chiffres uniquement'),
  
  minLength: (min: number) => createRule(
    (value: string) => validateLength(value, min).isValid,
    `Minimum ${min} caractères`
  ),
  
  maxLength: (max: number) => createRule(
    (value: string) => validateLength(value, undefined, max).isValid,
    `Maximum ${max} caractères`
  ),
  
  min: (min: number) => createRule(
    (value: number) => validateRange(value, min).isValid,
    `Valeur minimale: ${min}`
  ),
  
  max: (max: number) => createRule(
    (value: number) => validateRange(value, undefined, max).isValid,
    `Valeur maximale: ${max}`
  )
};
