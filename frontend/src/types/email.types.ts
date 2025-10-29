import { EmailTone, EmailProvider } from './enums';

export interface EmailData {
  subject: string;
  from: string;
  body: string;
  conversationId?: string;
  fullConversation?: string;
  internetMessageId?: string;
}

export interface EmailTemplateRequest {
  authToken?: string;
  userId: string;
  additionalInfo?: string;
  tone: EmailTone;
  subject?: string;
  from?: string;
  body?: string;
  conversationId?: string;
  language?: string;
}

export interface EmailTemplateResponse {
  generated_text: string;
  sources?: any[];
  temperature?: number;
  model?: string;
  use_retrieval?: boolean;
  include_profile_context?: boolean;
  conversation_history?: any;
}

export interface ComposeRequest {
  content: string;
  tone: EmailTone;
  language: string;
  operation: 'generate' | 'correct' | 'reformulate';
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
}
