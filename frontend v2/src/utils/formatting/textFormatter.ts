/**
 * Text Formatter Utilities
 * Fonctions pour le formatage de texte
 */

/**
 * Formater du texte avec des séquences d'échappement
 */
export const textFormatter = {
  /**
   * Traiter les séquences d'échappement
   */
  processEscapeSequences: (text: string): string => {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  },

  /**
   * Échapper les caractères spéciaux
   */
  escapeSpecialChars: (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");
  },

  /**
   * Tronquer un texte
   */
  truncate: (text: string, maxLength: number, ellipsis: string = '...'): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  },

  /**
   * Capitaliser la première lettre
   */
  capitalizeFirst: (text: string): string => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  /**
   * Capitaliser chaque mot
   */
  capitalizeWords: (text: string): string => {
    return text
      .split(' ')
      .map(word => textFormatter.capitalizeFirst(word))
      .join(' ');
  },

  /**
   * Convertir en camelCase
   */
  toCamelCase: (text: string): string => {
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
        return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
      })
      .replace(/\s+/g, '');
  },

  /**
   * Convertir en snake_case
   */
  toSnakeCase: (text: string): string => {
    return text
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },

  /**
   * Convertir en kebab-case
   */
  toKebabCase: (text: string): string => {
    return text
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  },

  /**
   * Supprimer les espaces multiples
   */
  removeExtraSpaces: (text: string): string => {
    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * Supprimer les balises HTML
   */
  stripHtml: (text: string): string => {
    return text.replace(/<[^>]*>/g, '');
  },

  /**
   * Échapper le HTML
   */
  escapeHtml: (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Décoder le HTML
   */
  unescapeHtml: (text: string): string => {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || '';
  },

  /**
   * Normaliser les sauts de ligne
   */
  normalizeLineBreaks: (text: string): string => {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  },

  /**
   * Compter les mots
   */
  countWords: (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  },

  /**
   * Compter les caractères (sans espaces)
   */
  countCharacters: (text: string, includeSpaces: boolean = true): number => {
    return includeSpaces ? text.length : text.replace(/\s/g, '').length;
  },

  /**
   * Extraire les premiers N mots
   */
  extractWords: (text: string, count: number): string => {
    const words = text.split(/\s+/);
    return words.slice(0, count).join(' ');
  },

  /**
   * Remplacer les caractères accentués
   */
  removeAccents: (text: string): string => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  /**
   * Générer un slug à partir d'un texte
   */
  slugify: (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Vérifier si un texte est vide (sans espaces)
   */
  isEmpty: (text: string): boolean => {
    return !text || text.trim().length === 0;
  },

  /**
   * Vérifier si un texte contient uniquement des espaces
   */
  isWhitespace: (text: string): boolean => {
    return /^\s*$/.test(text);
  },

  /**
   * Wrapper le texte à une largeur donnée
   */
  wrapText: (text: string, width: number): string => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length > width) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });

    if (currentLine) lines.push(currentLine.trim());
    return lines.join('\n');
  },

  /**
   * Indenter un texte
   */
  indent: (text: string, spaces: number = 2): string => {
    const indentation = ' '.repeat(spaces);
    return text
      .split('\n')
      .map(line => indentation + line)
      .join('\n');
  },

  /**
   * Extraire le preview d'un texte
   */
  getPreview: (text: string, maxLength: number = 150): string => {
    const stripped = textFormatter.stripHtml(text);
    return textFormatter.truncate(stripped, maxLength);
  },

  /**
   * Masquer les informations sensibles (emails, phones)
   */
  maskSensitive: (text: string): string => {
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');
  },

  /**
   * Formater un nombre avec séparateurs
   */
  formatNumber: (num: number, locale: string = 'fr-FR'): string => {
    return new Intl.NumberFormat(locale).format(num);
  },

  /**
   * Formater une taille de fichier
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
};

/**
 * Export des fonctions individuelles pour faciliter l'import
 */
export const {
  processEscapeSequences,
  escapeSpecialChars,
  truncate,
  capitalizeFirst,
  capitalizeWords,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  removeExtraSpaces,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  normalizeLineBreaks,
  countWords,
  countCharacters,
  extractWords,
  removeAccents,
  slugify,
  isEmpty,
  isWhitespace,
  wrapText,
  indent,
  getPreview,
  maskSensitive,
  formatNumber,
  formatFileSize
} = textFormatter;
