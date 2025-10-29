/**
 * API Client
 * Client Axios configuré pour toutes les requêtes API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, API_CONFIG } from '@/config/api';
import { requestInterceptor, responseInterceptor, errorInterceptor } from './interceptors';

/**
 * Instance Axios configurée
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  withCredentials: false
});

/**
 * Ajouter les intercepteurs
 */
apiClient.interceptors.request.use(requestInterceptor, errorInterceptor);
apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);

/**
 * Méthodes GET
 */
export async function get<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.get(url, config);
  return response.data;
}

/**
 * Méthodes POST
 */
export async function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.post(url, data, config);
  return response.data;
}

/**
 * Méthodes PUT
 */
export async function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.put(url, data, config);
  return response.data;
}

/**
 * Méthodes PATCH
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.patch(url, data, config);
  return response.data;
}

/**
 * Méthodes DELETE
 */
export async function del<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.delete(url, config);
  return response.data;
}

/**
 * Requête avec authentification
 */
export async function authenticatedRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
  token?: string
): Promise<T> {
  const config: AxiosRequestConfig = {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };

  switch (method) {
    case 'GET':
      return get<T>(url, config);
    case 'POST':
      return post<T>(url, data, config);
    case 'PUT':
      return put<T>(url, data, config);
    case 'PATCH':
      return patch<T>(url, data, config);
    case 'DELETE':
      return del<T>(url, config);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

/**
 * Upload de fichier avec progression
 */
export async function uploadFile<T = any>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  additionalData?: Record<string, any>
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
  }

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    }
  };

  return post<T>(url, formData, config);
}

/**
 * Télécharger un fichier
 */
export async function downloadFile(
  url: string,
  filename?: string
): Promise<void> {
  const response = await apiClient.get(url, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Requête avec retry automatique
 */
export async function requestWithRetry<T = any>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Ne pas retry sur les erreurs 4xx (sauf 429)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Attendre avant le prochain essai
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Batch de requêtes
 */
export async function batchRequests<T = any>(
  requests: Array<() => Promise<T>>,
  sequential: boolean = false
): Promise<T[]> {
  if (sequential) {
    const results: T[] = [];
    for (const request of requests) {
      results.push(await request());
    }
    return results;
  } else {
    return Promise.all(requests.map(req => req()));
  }
}

/**
 * Annuler une requête
 */
export function createCancelToken() {
  return axios.CancelToken.source();
}

/**
 * Vérifier si une erreur est une annulation
 */
export function isCancelError(error: any): boolean {
  return axios.isCancel(error);
}

/**
 * Configuration personnalisée pour une requête
 */
export function setRequestConfig(config: Partial<AxiosRequestConfig>): void {
  Object.assign(apiClient.defaults, config);
}

/**
 * Obtenir la configuration actuelle
 */
export function getRequestConfig(): AxiosRequestConfig {
  return { ...apiClient.defaults };
}
