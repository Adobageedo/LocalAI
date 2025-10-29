/**
 * API Interceptors
 * Intercepteurs pour les requêtes et réponses Axios
 */

import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { 
  CustomAxiosRequestConfig, 
  CustomInternalAxiosRequestConfig, 
  CacheEntry 
} from './types';

/**
 * Intercepteur de requête
 * Ajoute des headers et logs avant chaque requête
 */
export function requestInterceptor(config: AxiosRequestConfig): AxiosRequestConfig {
  // Ajouter un timestamp pour mesurer la durée
  if (config.headers) {
    config.headers['X-Request-Time'] = Date.now().toString();
  }

  // Logger la requête en mode debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data);
  }

  return config;
}

/**
 * Intercepteur de réponse
 * Traite les réponses réussies
 */
export function responseInterceptor(response: AxiosResponse): AxiosResponse {
  // Calculer la durée de la requête
  const requestTime = response.config.headers?. ['X-Request-Time'];
  if (requestTime) {
    const duration = Date.now() - parseInt(requestTime as string);
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', response.config.url, `${duration}ms`, response.status);
    }
  }

  return response;
}

/**
 * Intercepteur d'erreur
 * Gère les erreurs de requête et de réponse
 */
export function errorInterceptor(error: AxiosError): Promise<never> {
  // Logger l'erreur
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
  }

  // Erreur réseau
  if (!error.response) {
    return Promise.reject({
      message: 'Erreur de connexion réseau',
      code: 'NETWORK_ERROR',
      originalError: error
    });
  }

  // Erreurs HTTP spécifiques
  const status = error.response.status;
  const data = error.response.data as any;

  switch (status) {
    case 401:
      // Unauthorized - session expirée
      handleUnauthorized();
      return Promise.reject({
        message: 'Session expirée. Veuillez vous reconnecter.',
        code: 'UNAUTHORIZED',
        status,
        data
      });

    case 403:
      // Forbidden
      return Promise.reject({
        message: 'Accès interdit',
        code: 'FORBIDDEN',
        status,
        data
      });

    case 404:
      // Not Found
      return Promise.reject({
        message: 'Ressource introuvable',
        code: 'NOT_FOUND',
        status,
        data
      });

    case 429:
      // Too Many Requests
      return Promise.reject({
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        code: 'TOO_MANY_REQUESTS',
        status,
        data
      });

    case 500:
    case 502:
    case 503:
    case 504:
      // Server Errors
      return Promise.reject({
        message: 'Erreur serveur. Veuillez réessayer.',
        code: 'SERVER_ERROR',
        status,
        data
      });

    default:
      // Autres erreurs
      return Promise.reject({
        message: data?.message || data?.error || 'Une erreur est survenue',
        code: 'API_ERROR',
        status,
        data
      });
  }
}

/**
 * Gérer l'erreur d'authentification
 */
function handleUnauthorized(): void {
  // Nettoyer le token
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }

  // Émettre un événement pour que l'app puisse réagir
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

/**
 * Intercepteur pour ajouter le token d'authentification
 */
export function authTokenInterceptor(token: string) {
  return (config: AxiosRequestConfig): AxiosRequestConfig => {
    if (config.headers && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };
}

/**
 * Intercepteur pour gérer le refresh token
 */
export function refreshTokenInterceptor(
  refreshTokenFn: () => Promise<string>
) {
  return async (error: AxiosError): Promise<any> => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Si erreur 401 et pas déjà retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Obtenir un nouveau token
        const newToken = await refreshTokenFn();

        // Mettre à jour le header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Retry la requête originale
        return Promise.resolve(originalRequest);
      } catch (refreshError) {
        // Échec du refresh, déconnecter l'utilisateur
        handleUnauthorized();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  };
}

/**
 * Intercepteur pour logger les performances
 */
export function performanceInterceptor(config: AxiosRequestConfig): CustomAxiosRequestConfig {
  const customConfig = config as CustomAxiosRequestConfig;
  const startTime = performance.now();
  
  customConfig.metadata = {
    ...customConfig.metadata,
    startTime
  };

  return customConfig;
}

/**
 * Intercepteur de réponse pour les performances
 */
export function performanceResponseInterceptor(response: AxiosResponse): AxiosResponse {
  const config = response.config as CustomInternalAxiosRequestConfig;
  const startTime = config.metadata?.startTime;
  
  if (startTime) {
    const duration = performance.now() - startTime;
    
    // Logger les requêtes lentes (> 2s)
    if (duration > 2000) {
      console.warn('[Slow API Request]', {
        url: response.config.url,
        method: response.config.method,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  }

  return response;
}

/**
 * Intercepteur pour la gestion du cache
 */
export function cacheInterceptor(cache: Map<string, CacheEntry>, ttl: number = 300000) {
  return (config: AxiosRequestConfig): AxiosRequestConfig | Promise<AxiosResponse> => {
    // Seulement pour les requêtes GET
    if (config.method?.toUpperCase() !== 'GET') {
      return config;
    }

    const cacheKey = `${config.url}_${JSON.stringify(config.params)}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      // Retourner depuis le cache
      return Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        fromCache: true
      } as AxiosResponse);
    }

    return config;
  };
}

/**
 * Intercepteur de réponse pour mettre en cache
 */
export function cacheResponseInterceptor(cache: Map<string, CacheEntry>) {
  return (response: AxiosResponse): AxiosResponse => {
    // Seulement pour les GET réussis
    if (response.config.method?.toUpperCase() === 'GET' && response.status === 200) {
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params)}`;
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response;
  };
}
