/**
 * User Preferences Service
 * Service for managing user preferences and profile settings
 */

import { authFetch } from '../utils/helpers';
import { API_ENDPOINTS } from '../config/api';

// Types for user preferences
export interface UserPreferences {
  id?: number;
  user_id?: string;
  language: string;
  dark_mode: boolean;
  email_notifications: boolean;
  personnal_style_analysis: boolean;
  use_meeting_scripts: boolean;
  use_own_documents: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created_at?: string;
}

export interface UpdateUserPreferencesRequest {
  language?: string;
  dark_mode?: boolean;
  email_notifications?: boolean;
  personnal_style_analysis?: boolean;
  use_meeting_scripts?: boolean;
  use_own_documents?: boolean;
}

export interface UpdateUserProfileRequest {
  name?: string;
  phone?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * User Preferences Service Class
 */
export class UserPreferencesService {
  
  /**
   * Get current user profile
   */
  static async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PROFILE, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update current user profile
   */
  static async updateUserProfile(profileData: UpdateUserProfileRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current user preferences
   */
  static async getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PREFERENCES, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(preferences: UpdateUserPreferencesRequest): Promise<ApiResponse<UserPreferences>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PREFERENCES, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Preferences updated successfully'
      };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create user preferences (if they don't exist)
   */
  static async createUserPreferences(preferences: UpdateUserPreferencesRequest): Promise<ApiResponse<UserPreferences>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PREFERENCES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Preferences created successfully'
      };
    } catch (error) {
      console.error('Error creating user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete user preferences
   */
  static async deleteUserPreferences(): Promise<ApiResponse<void>> {
    try {
      const response = await authFetch(API_ENDPOINTS.USER_PREFERENCES, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        message: 'Preferences deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get default preferences
   */
  static getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      dark_mode: false,
      email_notifications: false,
      personnal_style_analysis: false,
      use_meeting_scripts: false,
      use_own_documents: true
    };
  }

  /**
   * Validate preferences before sending to API
   */
  static validatePreferences(preferences: Partial<UserPreferences>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (preferences.language && !['en', 'fr', 'es', 'de', 'it'].includes(preferences.language)) {
      errors.push('Invalid language selection');
    }

    if (preferences.language && preferences.language.length > 10) {
      errors.push('Language code too long');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export default instance
export default UserPreferencesService;
