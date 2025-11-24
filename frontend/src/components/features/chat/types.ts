/**
 * Type definitions for chat components
 */

export interface SuggestedButton {
  label: string;
  action: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedButtons?: SuggestedButton[];
}

export interface QuickAction {
  actionKey: string;
  email?: boolean;
  attachment?: {
    name: string;
    id: string;
    content?: string;
    contentType?: string;
  }[];
}

export interface EmailContext {
  subject?: string;
  from?: string;
  body?: string;
  date?: string;
}

export interface ChatSettings {
  useRag: boolean;
  useFineTune: boolean;
  includeAttachments: boolean;
}

export interface TemplateChatInterfaceProps {
  compose: boolean;
  quickActionKey?: string | null;
  tone?: string;
  llmActionProposal?: QuickAction[];
  activeActionKey?: string | null;
}
