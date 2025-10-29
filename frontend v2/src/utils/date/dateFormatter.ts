/**
 * Date Formatter Utilities
 * Fonctions pour le formatage de dates
 */

/**
 * Formater une date selon la locale
 */
export function formatDate(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d);
}

/**
 * Formater une date courte
 */
export function formatShortDate(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Formater une heure
 */
export function formatTime(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/**
 * Formater une date et heure
 */
export function formatDateTime(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/**
 * Formater une date relative (il y a X minutes)
 */
export function formatRelativeTime(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return locale.startsWith('fr') ? 'À l\'instant' : 'Just now';
  } else if (diffMinutes < 60) {
    return locale.startsWith('fr') 
      ? `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
      : `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return locale.startsWith('fr')
      ? `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
      : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return locale.startsWith('fr')
      ? `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
      : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatShortDate(d, locale);
  }
}

/**
 * Formater une durée en millisecondes
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  } else if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formater une date pour l'input
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formater une date ISO
 */
export function formatISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Obtenir le nom du mois
 */
export function getMonthName(monthIndex: number, locale: string = 'fr-FR'): string {
  const date = new Date(2000, monthIndex, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
}

/**
 * Obtenir le nom du jour
 */
export function getDayName(dayIndex: number, locale: string = 'fr-FR'): string {
  const date = new Date(2000, 0, dayIndex + 2); // 2 Jan 2000 was Sunday
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}

/**
 * Formater un timestamp
 */
export function formatTimestamp(timestamp: number, locale: string = 'fr-FR'): string {
  return formatDateTime(new Date(timestamp), locale);
}

/**
 * Formater l'âge d'un élément
 */
export function formatAge(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffYears > 0) {
    return `${diffYears} an${diffYears > 1 ? 's' : ''}`;
  } else if (diffMonths > 0) {
    return `${diffMonths} mois`;
  } else {
    return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
}

/**
 * Vérifier si une date est aujourd'hui
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Vérifier si une date est hier
 */
export function isYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

/**
 * Vérifier si une date est cette semaine
 */
export function isThisWeek(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  return d >= weekStart && d < weekEnd;
}

/**
 * Obtenir la date de début de semaine
 */
export function getWeekStart(date: Date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtenir la date de fin de semaine
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}
