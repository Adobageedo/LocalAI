/**
 * API Client Types
 * Types personnalisés pour étendre Axios
 */

import { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

/**
 * Métadonnées personnalisées pour les requêtes
 */
export interface RequestMetadata {
  startTime?: number;
  retryCount?: number;
  [key: string]: any;
}

/**
 * Extension du type AxiosRequestConfig avec métadonnées
 */
export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: RequestMetadata;
  _retry?: boolean;
}

/**
 * Extension du type InternalAxiosRequestConfig avec métadonnées
 */
export interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
  _retry?: boolean;
}

/**
 * Cache entry type
 */
export interface CacheEntry {
  data: any;
  timestamp: number;
}
