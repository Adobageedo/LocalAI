/**
 * Email Validator Utilities
 * Fonctions de validation d'emails
 */

/**
 * Valider une adresse email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valider une liste d'emails
 */
export function validateEmailList(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });
  
  return { valid, invalid };
}

/**
 * Valider un sujet d'email
 */
export function validateSubject(subject: string): {
  isValid: boolean;
  error?: string;
} {
  if (!subject || subject.trim().length === 0) {
    return { isValid: false, error: 'Le sujet est requis' };
  }
  
  if (subject.length > 200) {
    return { isValid: false, error: 'Le sujet est trop long (max 200 caractères)' };
  }
  
  return { isValid: true };
}

/**
 * Valider un corps d'email
 */
export function validateBody(body: string): {
  isValid: boolean;
  error?: string;
} {
  if (!body || body.trim().length === 0) {
    return { isValid: false, error: 'Le corps de l\'email est requis' };
  }
  
  if (body.length > 50000) {
    return { isValid: false, error: 'Le corps est trop long (max 50000 caractères)' };
  }
  
  return { isValid: true };
}

/**
 * Valider un email complet
 */
export function validateEmail(email: {
  to?: string[];
  subject?: string;
  body?: string;
  from?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Valider destinataires
  if (!email.to || email.to.length === 0) {
    errors.push('Au moins un destinataire est requis');
  } else {
    const { invalid } = validateEmailList(email.to);
    if (invalid.length > 0) {
      errors.push(`Adresses invalides: ${invalid.join(', ')}`);
    }
  }
  
  // Valider expéditeur
  if (email.from && !isValidEmail(email.from)) {
    errors.push('Adresse expéditeur invalide');
  }
  
  // Valider sujet
  if (email.subject) {
    const subjectValidation = validateSubject(email.subject);
    if (!subjectValidation.isValid && subjectValidation.error) {
      errors.push(subjectValidation.error);
    }
  }
  
  // Valider corps
  if (email.body) {
    const bodyValidation = validateBody(email.body);
    if (!bodyValidation.isValid && bodyValidation.error) {
      errors.push(bodyValidation.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Vérifier si un email semble être du spam
 */
export function isLikelySpam(subject: string, body: string): {
  isSpam: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const spamKeywords = [
    'viagra', 'casino', 'lottery', 'winner', 'prize',
    'click here', 'act now', 'limited time', 'free money'
  ];
  
  const textToCheck = (subject + ' ' + body).toLowerCase();
  
  // Vérifier mots-clés spam
  spamKeywords.forEach(keyword => {
    if (textToCheck.includes(keyword)) {
      reasons.push(`Contient le mot-clé spam: ${keyword}`);
    }
  });
  
  // Vérifier majuscules excessives
  const uppercaseRatio = (textToCheck.match(/[A-Z]/g) || []).length / textToCheck.length;
  if (uppercaseRatio > 0.5) {
    reasons.push('Trop de majuscules');
  }
  
  // Vérifier points d'exclamation excessifs
  const exclamationCount = (textToCheck.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    reasons.push('Trop de points d\'exclamation');
  }
  
  return {
    isSpam: reasons.length > 0,
    reasons
  };
}

/**
 * Nettoyer une adresse email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Extraire le domaine d'un email
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}

/**
 * Vérifier si un domaine est courant
 */
export function isCommonDomain(email: string): boolean {
  const domain = extractDomain(email);
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'protonmail.com'
  ];
  return commonDomains.includes(domain);
}
