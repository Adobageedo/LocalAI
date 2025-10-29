/**
 * API Response Types
 * Types pour les réponses API
 */

/**
 * Réponse API générique
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

/**
 * Erreur API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp?: string;
}

/**
 * Métadonnées de réponse
 */
export interface ResponseMetadata {
  requestId?: string;
  timestamp?: string;
  duration?: number;
  version?: string;
  [key: string]: any;
}

/**
 * Réponse paginée
 */
export interface PaginatedResponse<T = any> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Réponse de batch
 */
export interface BatchResponse<T = any> {
  results: Array<ApiResponse<T>>;
  successCount: number;
  failureCount: number;
  totalCount: number;
}

/**
 * Status de santé de l'API
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks?: {
    database?: 'ok' | 'error';
    llm?: 'ok' | 'error';
    storage?: 'ok' | 'error';
  };
}

/**
 * Réponse de validation
 */
export interface ValidationResponse {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Type guard pour vérifier si une réponse est un succès
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard pour vérifier si une réponse est une erreur
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiError } {
  return response.success === false && response.error !== undefined;
}

/**
 * Helper pour créer une réponse de succès
 */
export function createSuccessResponse<T>(data: T, metadata?: ResponseMetadata): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata
  };
}

/**
 * Helper pour créer une réponse d'erreur
 */
export function createErrorResponse(error: ApiError, metadata?: ResponseMetadata): ApiResponse {
  return {
    success: false,
    error,
    metadata
  };
}
