import { API_CONFIG } from '../../config';
import { ApiError, ApiResponse } from '../../types';
import { authFetch } from '../../utils/helpers';

/**
 * Base API Service
 * Provides common HTTP methods for all API services
 */
export class BaseApiService {
  protected baseURL: string;

  constructor(baseURL: string = API_CONFIG.baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Generic request method with error handling
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await authFetch(url, options);

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Handle API errors
   */
  protected async handleError(response: Response): Promise<ApiError> {
    const errorData = await response.json().catch(() => ({}));
    return {
      message: errorData.message || errorData.error || response.statusText,
      status: response.status,
      details: errorData,
    };
  }

  /**
   * GET request
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  protected async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  protected async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  protected async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
