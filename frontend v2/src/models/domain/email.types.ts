/**
 * Email Domain Types
 * Types et interfaces pour le domaine email
 */

import { AttachmentInfo } from './attachment.types';

/**
 * Email principal
 */
export interface Email {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  
  // Contenu
  subject: string;
  body: string;
  bodyPreview?: string;
  
  // Participants
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  
  // Métadonnées
  sentDateTime?: Date;
  receivedDateTime?: Date;
  hasAttachments: boolean;
  attachments?: AttachmentInfo[];
  
  // Flags
  isRead: boolean;
  importance: 'low' | 'normal' | 'high';
  flag?: {
    flagStatus: 'notFlagged' | 'flagged' | 'complete';
    dueDateTime?: Date;
  };
  
  // Catégories
  categories?: string[];
  
  // Metadata
  isDraft: boolean;
  isDeliveryReceiptRequested?: boolean;
  isReadReceiptRequested?: boolean;
}

/**
 * Contexte email pour génération/modification
 */
export interface EmailContext {
  subject?: string;
  from?: string;
  to?: string | string[];
  body?: string;
  tone?: string;
  language?: string;
  additionalInfo?: string;
  attachments?: Array<{
    name: string;
    content?: string;
  }>;
  metadata?: EmailMetadata;
}

/**
 * Métadonnées email
 */
export interface EmailMetadata {
  conversationId?: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  importance?: 'low' | 'normal' | 'high';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
}

/**
 * Options de ton pour les emails
 */
export type EmailTone = 
  | 'professional'
  | 'friendly'
  | 'formal'
  | 'casual'
  | 'urgent'
  | 'apologetic';

/**
 * Types d'actions email
 */
export type EmailAction = 
  | 'generate'
  | 'correct'
  | 'reformulate'
  | 'summarize'
  | 'reply'
  | 'translate';

/**
 * Requête de génération d'email
 */
export interface GenerateEmailRequest {
  additionalInfo?: string;
  tone: string;
  language: string;
  userId: string;
  from?: string;
  to?: string | string[];
  subject?: string;
  body?: string;
  attachments?: AttachmentInfo[];
}

/**
 * Requête de correction d'email
 */
export interface CorrectEmailRequest {
  body: string;
  language: string;
  userId: string;
  additionalInfo?: string;
  preserveTone?: boolean;
}

/**
 * Requête de reformulation d'email
 */
export interface ReformulateEmailRequest {
  body: string;
  additionalInfo?: string;
  tone: string;
  language: string;
  userId: string;
  targetLength?: 'shorter' | 'same' | 'longer';
}

/**
 * Requête de résumé d'email
 */
export interface SummarizeEmailRequest {
  body?: string;
  attachmentContent?: string;
  language: string;
  userId: string;
  format?: 'paragraph' | 'bullets' | 'detailed';
}

/**
 * Réponse de génération d'email
 */
export interface EmailGenerationResponse {
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    generationTime?: number;
    styleAnalysisUsed?: boolean;
  };
}

/**
 * Draft email (brouillon)
 */
export interface DraftEmail {
  id: string;
  userId: string;
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  attachments?: AttachmentInfo[];
  createdAt: Date;
  updatedAt: Date;
  autoSaved: boolean;
}

/**
 * Historique d'email généré
 */
export interface EmailHistory {
  id: string;
  userId: string;
  action: EmailAction;
  originalContent?: string;
  generatedContent: string;
  tone?: string;
  language?: string;
  metadata?: {
    tokensUsed?: number;
    generationTime?: number;
  };
  createdAt: Date;
}

/**
 * Signature email
 */
export interface EmailSignature {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Règle de traitement automatique
 */
export interface EmailRule {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  
  // Conditions
  conditions: {
    from?: string[];
    to?: string[];
    subject?: string[];
    hasAttachments?: boolean;
    importance?: ('low' | 'normal' | 'high')[];
  };
  
  // Actions
  actions: {
    autoReply?: boolean;
    autoSummarize?: boolean;
    autoTag?: string[];
    moveToFolder?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Statistiques email
 */
export interface EmailStats {
  totalSent: number;
  totalReceived: number;
  totalGenerated: number;
  totalCorrected: number;
  totalReformulated: number;
  totalSummarized: number;
  
  averageLength: number;
  mostUsedTone: string;
  mostUsedLanguage: string;
  
  byDate: {
    date: string;
    count: number;
  }[];
}

/**
 * Validation d'email
 */
export interface EmailValidation {
  isValid: boolean;
  errors: {
    field: 'subject' | 'body' | 'to' | 'from';
    message: string;
  }[];
  warnings?: {
    field: string;
    message: string;
  }[];
}

/**
 * Helper pour valider une adresse email
 */
export function isValidEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper pour valider un email complet
 */
export function validateEmail(email: Partial<Email>): EmailValidation {
  const errors: EmailValidation['errors'] = [];
  
  if (!email.subject || email.subject.trim().length === 0) {
    errors.push({ field: 'subject', message: 'Le sujet est requis' });
  }
  
  if (!email.body || email.body.trim().length === 0) {
    errors.push({ field: 'body', message: 'Le corps de l\'email est requis' });
  }
  
  if (!email.to || email.to.length === 0) {
    errors.push({ field: 'to', message: 'Au moins un destinataire est requis' });
  } else {
    const invalidRecipients = email.to.filter(addr => !isValidEmailAddress(addr));
    if (invalidRecipients.length > 0) {
      errors.push({ 
        field: 'to', 
        message: `Adresses invalides: ${invalidRecipients.join(', ')}` 
      });
    }
  }
  
  if (email.from && !isValidEmailAddress(email.from)) {
    errors.push({ field: 'from', message: 'Adresse expéditeur invalide' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper pour extraire le nom d'un email
 */
export function extractNameFromEmail(email: string): string {
  const match = email.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].trim() : email.split('@')[0];
}

/**
 * Helper pour formater un destinataire
 */
export function formatRecipient(name: string, email: string): string {
  return `${name} <${email}>`;
}

/**
 * Helper pour obtenir le preview du body
 */
export function getBodyPreview(body: string, maxLength: number = 100): string {
  const strippedBody = body.replace(/<[^>]*>/g, '').trim();
  return strippedBody.length > maxLength 
    ? strippedBody.substring(0, maxLength) + '...'
    : strippedBody;
}
