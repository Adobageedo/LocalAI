import { BaseApiService } from './baseService';
import { API_ENDPOINTS } from '../../config';
import { SyncStatusResponse, ConnectResponse, SyncResponse } from '../../types';

/**
 * Authentication Service
 * Handles OAuth and authentication operations
 */
export class AuthService extends BaseApiService {
  /**
   * Get Outlook authentication status
   */
  async getOutlookAuthStatus() {
    return this.get<SyncStatusResponse>(API_ENDPOINTS.OUTLOOK_AUTH_STATUS);
  }

  /**
   * Connect to Outlook (get OAuth URL)
   */
  async connectOutlook() {
    return this.get<ConnectResponse>(API_ENDPOINTS.OUTLOOK_AUTH_LOGIN);
  }

  /**
   * Disconnect from Outlook
   */
  async disconnectOutlook() {
    return this.delete(API_ENDPOINTS.OUTLOOK_AUTH_REVOKE);
  }

  /**
   * Sync Outlook emails
   */
  async syncOutlookEmails() {
    return this.post<SyncResponse>('/outlook/sync', {});
  }

  /**
   * Get Gmail authentication status
   */
  async getGmailAuthStatus() {
    return this.get<SyncStatusResponse>(API_ENDPOINTS.GMAIL_AUTH_STATUS);
  }

  /**
   * Connect to Gmail (get OAuth URL)
   */
  async connectGmail() {
    return this.get<ConnectResponse>(API_ENDPOINTS.GMAIL_AUTH_LOGIN);
  }

  /**
   * Disconnect from Gmail
   */
  async disconnectGmail() {
    return this.delete(API_ENDPOINTS.GMAIL_AUTH_REVOKE);
  }

  /**
   * Sync Gmail emails
   */
  async syncGmailEmails() {
    return this.post<SyncResponse>('/gmail/sync', {});
  }
}

// Export singleton instance
export const authService = new AuthService();
