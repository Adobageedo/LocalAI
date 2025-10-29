/**
 * Email Parser Utilities
 * Fonctions pour parser et analyser des emails
 */

/**
 * Extraire le nom d'une adresse email formatée
 */
export function extractNameFromEmail(email: string): string {
  // Format: "John Doe <john@example.com>"
  const match = email.match(/^(.+?)\s*<.+>$/);
  if (match) {
    return match[1].trim().replace(/['"]/g, '');
  }
  // Format: "john@example.com"
  return email.split('@')[0].replace(/[._-]/g, ' ');
}

/**
 * Extraire l'adresse d'une chaîne formatée
 */
export function extractEmailAddress(formatted: string): string {
  const match = formatted.match(/<([^>]+)>/);
  return match ? match[1] : formatted.trim();
}

/**
 * Parser une liste d'emails séparés par des virgules
 */
export function parseEmailList(emailString: string): string[] {
  return emailString
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

/**
 * Extraire toutes les adresses d'un texte
 */
export function extractAllEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

/**
 * Parser les headers d'un email
 */
export function parseEmailHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerText.split('\n');
  
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key.toLowerCase()] = value;
    }
  });
  
  return headers;
}

/**
 * Extraire le corps de texte d'un email HTML
 */
export function extractTextFromHtml(html: string): string {
  // Créer un élément temporaire
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Supprimer les scripts et styles
  const scripts = temp.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());
  
  // Obtenir le texte
  return temp.textContent || temp.innerText || '';
}

/**
 * Extraire la signature d'un email
 */
export function extractSignature(body: string): string | null {
  // Chercher des patterns courants de signature
  const patterns = [
    /--\s*\n([\s\S]+)$/,  // -- \n signature
    /^Cordialement,?\s*\n([\s\S]+)$/m,
    /^Best regards,?\s*\n([\s\S]+)$/m,
    /^Regards,?\s*\n([\s\S]+)$/m
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extraire les URLs d'un email
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Extraire les numéros de téléphone
 */
export function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  return text.match(phoneRegex) || [];
}

/**
 * Détecter la langue d'un email (simple heuristique)
 */
export function detectLanguage(text: string): string {
  const languagePatterns: Record<string, RegExp[]> = {
    fr: [/\b(le|la|les|un|une|des|et|ou|dans|pour|avec|est|sont)\b/i],
    en: [/\b(the|a|an|and|or|in|for|with|is|are|to|of)\b/i],
    es: [/\b(el|la|los|las|un|una|y|o|en|para|con|es|son)\b/i],
    de: [/\b(der|die|das|ein|eine|und|oder|in|für|mit|ist|sind)\b/i]
  };
  
  const scores: Record<string, number> = {};
  
  Object.keys(languagePatterns).forEach(lang => {
    scores[lang] = 0;
    languagePatterns[lang].forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        scores[lang] += matches.length;
      }
    });
  });
  
  // Retourner la langue avec le plus haut score
  const detectedLang = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );
  
  return scores[detectedLang] > 0 ? detectedLang : 'en';
}

/**
 * Parser un thread d'emails
 */
export function parseEmailThread(body: string): string[] {
  // Séparer par des patterns courants de réponse
  const separators = [
    /^On .+ wrote:$/m,
    /^Le .+ a écrit :$/m,
    /^From: .+$/m,
    /^De : .+$/m,
    /_{10,}/,
    /-{10,}/
  ];
  
  let parts = [body];
  
  separators.forEach(separator => {
    const newParts: string[] = [];
    parts.forEach(part => {
      const split = part.split(separator);
      newParts.push(...split);
    });
    parts = newParts;
  });
  
  return parts.map(part => part.trim()).filter(part => part.length > 0);
}

/**
 * Extraire le dernier message d'un thread
 */
export function extractLatestMessage(body: string): string {
  const thread = parseEmailThread(body);
  return thread[0] || body;
}

/**
 * Détecter si un email est une réponse
 */
export function isReply(subject: string): boolean {
  const replyPrefixes = ['re:', 'ré:', 'r:', 'rép:'];
  const lowerSubject = subject.toLowerCase().trim();
  return replyPrefixes.some(prefix => lowerSubject.startsWith(prefix));
}

/**
 * Détecter si un email est un transfert
 */
export function isForward(subject: string): boolean {
  const forwardPrefixes = ['fwd:', 'fw:', 'tr:', 'transf:'];
  const lowerSubject = subject.toLowerCase().trim();
  return forwardPrefixes.some(prefix => lowerSubject.startsWith(prefix));
}

/**
 * Nettoyer un sujet (enlever RE:, FWD:, etc.)
 */
export function cleanSubject(subject: string): string {
  return subject
    .replace(/^(re|ré|r|rép|fwd|fw|tr|transf):\s*/i, '')
    .trim();
}

/**
 * Créer un preview d'email
 */
export function createEmailPreview(body: string, maxLength: number = 150): string {
  const text = extractTextFromHtml(body);
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength 
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
}
