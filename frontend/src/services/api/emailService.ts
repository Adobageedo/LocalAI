import { BaseApiService } from './baseService';
import { API_ENDPOINTS } from '../../config';
import { EmailTemplateRequest, EmailTemplateResponse, ComposeRequest } from '../../types';

/**
 * Email Service
 * Handles all email-related API operations
 */
export class EmailService extends BaseApiService {
  /**
   * Generate email template based on context
   */
  async generateTemplate(request: EmailTemplateRequest) {
    return this.post<EmailTemplateResponse>(API_ENDPOINTS.OUTLOOK_TEMPLATE, request);
  }

  /**
   * Generate new email content
   */
  async generateEmail(request: ComposeRequest) {
    return this.post(API_ENDPOINTS.COMPOSE, {
      ...request,
      operation: 'generate',
    });
  }

  /**
   * Correct existing email content
   */
  async correctEmail(request: ComposeRequest) {
    return this.post(API_ENDPOINTS.COMPOSE, {
      ...request,
      operation: 'correct',
    });
  }

  /**
   * Reformulate email content
   */
  async reformulateEmail(request: ComposeRequest) {
    return this.post(API_ENDPOINTS.COMPOSE, {
      ...request,
      operation: 'reformulate',
    });
  }

  /**
   * Summarize email or document content
   */
  async summarize(content: string, language?: string) {
    return this.post(API_ENDPOINTS.OUTLOOK_SUMMARIZE, { 
      content,
      language 
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
