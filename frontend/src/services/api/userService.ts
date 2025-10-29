import { BaseApiService } from './baseService';
import { API_ENDPOINTS } from '../../config';
import { UserProfile, UserPreferences, UpdateUserProfileRequest, UpdatePreferencesRequest } from '../../types';

/**
 * User Service
 * Handles user profile and preferences operations
 */
export class UserService extends BaseApiService {
  /**
   * Get user profile
   */
  async getProfile(userId?: string) {
    const endpoint = userId ? `${API_ENDPOINTS.USER_PROFILE}/${userId}` : API_ENDPOINTS.USER_PROFILE;
    return this.get<UserProfile>(endpoint);
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateUserProfileRequest) {
    return this.put<UserProfile>(API_ENDPOINTS.USER_PROFILE, data);
  }

  /**
   * Create new user
   */
  async createUser(userData: Partial<UserProfile>) {
    return this.post<UserProfile>(API_ENDPOINTS.USERS, userData);
  }

  /**
   * Get user preferences
   */
  async getPreferences() {
    return this.get<UserPreferences>(API_ENDPOINTS.USER_PREFERENCES);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(data: UpdatePreferencesRequest) {
    return this.put<UserPreferences>(API_ENDPOINTS.USER_PREFERENCES, data);
  }

  /**
   * Create user preferences
   */
  async createPreferences(data: Partial<UserPreferences>) {
    return this.post<UserPreferences>(API_ENDPOINTS.USER_PREFERENCES, data);
  }

  /**
   * Delete user preferences
   */
  async deletePreferences() {
    return this.delete(API_ENDPOINTS.USER_PREFERENCES);
  }
}

// Export singleton instance
export const userService = new UserService();
