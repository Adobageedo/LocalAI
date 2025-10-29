/**
 * API Request Types
 * Types pour les requêtes API
 */

/**
 * Headers de requête communes
 */
export interface RequestHeaders {
  'Content-Type'?: string;
  'Authorization'?: string;
  'Accept'?: string;
  'X-Request-ID'?: string;
  [key: string]: string | undefined;
}

/**
 * Configuration de requête générique
 */
export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: RequestHeaders;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
}

/**
 * Requête paginée
 */
export interface PaginatedRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Requête de recherche
 */
export interface SearchRequest extends PaginatedRequest {
  query: string;
  filters?: Record<string, any>;
}

/**
 * Requête avec options de cache
 */
export interface CacheableRequest {
  cacheKey?: string;
  cacheTTL?: number;
  forceRefresh?: boolean;
}

/**
 * Requête de batch
 */
export interface BatchRequest<T = any> {
  requests: T[];
  sequential?: boolean;
  stopOnError?: boolean;
}

/**
 * Requête d'upload de fichier
 */
export interface FileUploadRequest {
  file: File;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

/**
 * Requête avec retry
 */
export interface RetryableRequest {
  maxRetries?: number;
  retryDelay?: number;
  retryOn?: number[];
}
