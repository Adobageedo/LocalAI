/**
 * API Helper Utilities
 * Fonctions utilitaires pour les appels API
 */

import { HTTP_STATUS } from '@/config/constants';

/**
 * Parser une erreur API
 */
export function parseApiError(error: any): string {
  // Erreur avec message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Erreur avec error
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Erreur HTTP standard
  if (error?.response?.status) {
    const status = error.response.status;
    
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return 'Requête invalide';
      case HTTP_STATUS.UNAUTHORIZED:
        return 'Non autorisé. Veuillez vous reconnecter.';
      case HTTP_STATUS.FORBIDDEN:
        return 'Accès interdit';
      case HTTP_STATUS.NOT_FOUND:
        return 'Ressource introuvable';
      case HTTP_STATUS.CONFLICT:
        return 'Conflit de données';
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'Trop de requêtes. Veuillez réessayer plus tard.';
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return 'Erreur serveur interne';
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return 'Service temporairement indisponible';
      default:
        return `Erreur ${status}`;
    }
  }
  
  // Erreur réseau
  if (error?.message === 'Network Error') {
    return 'Erreur de connexion réseau';
  }
  
  // Erreur de timeout
  if (error?.code === 'ECONNABORTED') {
    return 'La requête a expiré';
  }
  
  // Message d'erreur par défaut
  if (error?.message) {
    return error.message;
  }
  
  return 'Une erreur est survenue';
}

/**
 * Construire une URL avec query params
 */
export function buildUrlWithParams(
  baseUrl: string,
  params?: Record<string, any>
): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Créer des headers avec authentification
 */
export function createAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Vérifier si une réponse est un succès
 */
export function isSuccessResponse(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Vérifier si une erreur est une erreur d'authentification
 */
export function isAuthError(error: any): boolean {
  const status = error?.response?.status;
  return status === HTTP_STATUS.UNAUTHORIZED || status === HTTP_STATUS.FORBIDDEN;
}

/**
 * Vérifier si une erreur est une erreur réseau
 */
export function isNetworkError(error: any): boolean {
  return error?.message === 'Network Error' || !error?.response;
}

/**
 * Retry d'une fonction async avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2
  } = options;
  
  let lastError: any;
  let delay = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Ne pas retry sur les erreurs d'authentification
      if (isAuthError(error)) {
        throw error;
      }
      
      // Attendre avant le prochain essai
      if (i < maxRetries - 1) {
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debouncer pour les appels API
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttler pour les appels API
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Formatter une réponse API
 */
export function formatApiResponse<T>(data: any): T {
  // Si la réponse contient un champ 'data'
  if (data?.data !== undefined) {
    return data.data;
  }
  
  return data;
}

/**
 * Créer un AbortController avec timeout
 */
export function createAbortControllerWithTimeout(timeoutMs: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return { controller, timeoutId };
}

/**
 * Nettoyer les query params (enlever null/undefined)
 */
export function cleanParams(params: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
}

/**
 * Convertir FormData en objet
 */
export function formDataToObject(formData: FormData): Record<string, any> {
  const object: Record<string, any> = {};
  formData.forEach((value, key) => {
    object[key] = value;
  });
  return object;
}

/**
 * Convertir objet en FormData
 */
export function objectToFormData(obj: Record<string, any>): FormData {
  const formData = new FormData();
  Object.keys(obj).forEach(key => {
    formData.append(key, obj[key]);
  });
  return formData;
}
