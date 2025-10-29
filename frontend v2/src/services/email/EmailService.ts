/**
 * Email Service
 * Service pour gérer les opérations email
 */

import {
  GenerateEmailRequest,
  CorrectEmailRequest,
  ReformulateEmailRequest,
  SummarizeEmailRequest,
  EmailGenerationResponse,
  Email
} from '@/models/domain';
import {
  generateEmail,
  correctEmail,
  reformulateEmail,
  summarizeEmail
} from '@/api/endpoints/emailApi';
import { TokenService } from '../auth/TokenService';

export class EmailService {
  /**
   * Générer un email
   */
  async generateEmail(request: GenerateEmailRequest): Promise<EmailGenerationResponse> {
    const token = this.getToken();
    return generateEmail(request, token);
  }

  /**
   * Corriger un email
   */
  async correctEmail(request: CorrectEmailRequest): Promise<EmailGenerationResponse> {
    const token = this.getToken();
    return correctEmail(request, token);
  }

  /**
   * Reformuler un email
   */
  async reformulateEmail(request: ReformulateEmailRequest): Promise<EmailGenerationResponse> {
    const token = this.getToken();
    return reformulateEmail(request, token);
  }

  /**
   * Résumer un email
   */
  async summarizeEmail(request: SummarizeEmailRequest): Promise<EmailGenerationResponse> {
    const token = this.getToken();
    return summarizeEmail(request, token);
  }

  /**
   * Valider un email avant envoi
   */
  validateEmail(email: Partial<Email>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email.to || email.to.length === 0) {
      errors.push('Au moins un destinataire est requis');
    }

    if (!email.subject || email.subject.trim().length === 0) {
      errors.push('Le sujet est requis');
    }

    if (!email.body || email.body.trim().length === 0) {
      errors.push('Le corps de l\'email est requis');
    }

    // Valider les adresses email
    if (email.to) {
      const invalidEmails = email.to.filter(addr => !this.isValidEmail(addr));
      if (invalidEmails.length > 0) {
        errors.push(`Adresses invalides: ${invalidEmails.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider une adresse email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Obtenir le token d'authentification
   */
  private getToken(): string {
    const token = TokenService.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return token;
  }

  /**
   * Nettoyer le corps d'un email (enlever HTML, espaces superflus)
   */
  cleanEmailBody(body: string): string {
    // Enlever les balises HTML
    let cleaned = body.replace(/<[^>]*>/g, '');
    
    // Enlever les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Enlever les espaces en début/fin
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Créer un preview d'email
   */
  createEmailPreview(body: string, maxLength: number = 150): string {
    const cleaned = this.cleanEmailBody(body);
    return cleaned.length > maxLength 
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned;
  }

  /**
   * Compter les mots dans un email
   */
  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimer le temps de lecture
   */
  estimateReadingTime(text: string): number {
    const wordCount = this.countWords(text);
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

/**
 * Instance singleton
 */
const emailService = new EmailService();

export default emailService;
