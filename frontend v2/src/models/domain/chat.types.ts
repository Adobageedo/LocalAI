/**
 * Chat Domain Types
 * Types et interfaces pour le système de chat
 */

/**
 * Rôle du message dans le chat
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Message de chat
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  suggestedButtons?: SuggestedButton[];
  metadata?: MessageMetadata;
}

/**
 * Bouton suggéré par l'IA
 */
export interface SuggestedButton {
  label: string;
  action: string;
  category?: 'content' | 'refinement' | 'expansion';
}

/**
 * Métadonnées du message
 */
export interface MessageMetadata {
  tokensUsed?: number;
  model?: string;
  temperature?: number;
  generationTime?: number;
  cached?: boolean;
}

/**
 * Conversation de chat
 */
export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  context?: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

/**
 * Contexte de la conversation
 */
export interface ConversationContext {
  emailSubject?: string;
  emailFrom?: string;
  emailBody?: string;
  tone?: string;
  language?: string;
  activeAction?: string;
  attachments?: Array<{
    name: string;
    content?: string;
  }>;
}

/**
 * Historique des conversations
 */
export interface ConversationHistory {
  userId: string;
  conversations: Conversation[];
  totalCount: number;
  lastUpdated: Date;
}

/**
 * Requête de chat
 */
export interface ChatRequest {
  conversationId: string;
  message: string;
  context?: ConversationContext;
  options?: ChatOptions;
}

/**
 * Options de chat
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  includeSuggestions?: boolean;
  model?: string;
}

/**
 * Réponse de chat
 */
export interface ChatResponse {
  messageId: string;
  content: string;
  suggestedButtons?: SuggestedButton[];
  metadata?: MessageMetadata;
  conversationId: string;
}

/**
 * Chunk de streaming (importé depuis api/stream.types)
 * Note: Utiliser StreamChunk depuis '@/models/api' pour le streaming
 */
export interface ChatStreamChunk {
  type: 'chunk' | 'done' | 'error';
  delta?: string;
  message?: string;
  metadata?: MessageMetadata;
}

/**
 * Statut de la conversation
 */
export type ConversationStatus = 'active' | 'paused' | 'completed' | 'archived';

/**
 * Statistiques de conversation
 */
export interface ConversationStats {
  conversationId: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  suggestedButtonsClickRate: number;
  duration: number; // en millisecondes
  createdAt: Date;
  lastMessageAt: Date;
}

/**
 * État du chat
 */
export interface ChatState {
  isLoading: boolean;
  isStreaming: boolean;
  isTyping: boolean;
  error: string | null;
  currentConversationId: string | null;
}

/**
 * Message en cours de saisie (typing indicator)
 */
export interface TypingIndicator {
  conversationId: string;
  isTyping: boolean;
  startedAt?: Date;
}

/**
 * Feedback sur un message
 */
export interface MessageFeedback {
  messageId: string;
  conversationId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  categories?: string[];
  submittedAt: Date;
}

/**
 * Template de conversation
 */
export interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  initialMessage: string;
  suggestedActions: string[];
  context?: Partial<ConversationContext>;
  category: string;
}

/**
 * Helper pour créer un nouveau message
 */
export function createChatMessage(
  role: ChatRole,
  content: string,
  suggestedButtons?: SuggestedButton[]
): ChatMessage {
  return {
    id: Date.now().toString(),
    role,
    content,
    timestamp: new Date(),
    suggestedButtons
  };
}

/**
 * Helper pour créer une nouvelle conversation
 */
export function createConversation(
  userId: string,
  initialMessage?: ChatMessage,
  context?: ConversationContext
): Conversation {
  return {
    id: `conv_${Date.now()}`,
    userId,
    messages: initialMessage ? [initialMessage] : [],
    context,
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false
  };
}

/**
 * Helper pour ajouter un message à une conversation
 */
export function addMessageToConversation(
  conversation: Conversation,
  message: ChatMessage
): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date()
  };
}

/**
 * Helper pour obtenir le dernier message
 */
export function getLastMessage(conversation: Conversation): ChatMessage | undefined {
  return conversation.messages[conversation.messages.length - 1];
}

/**
 * Helper pour obtenir les messages utilisateur
 */
export function getUserMessages(conversation: Conversation): ChatMessage[] {
  return conversation.messages.filter(m => m.role === 'user');
}

/**
 * Helper pour obtenir les messages assistant
 */
export function getAssistantMessages(conversation: Conversation): ChatMessage[] {
  return conversation.messages.filter(m => m.role === 'assistant');
}

/**
 * Helper pour compter les tokens utilisés
 */
export function getTotalTokensUsed(conversation: Conversation): number {
  return conversation.messages.reduce((total, message) => {
    return total + (message.metadata?.tokensUsed || 0);
  }, 0);
}

/**
 * Helper pour calculer la durée de la conversation
 */
export function getConversationDuration(conversation: Conversation): number {
  if (conversation.messages.length === 0) return 0;
  
  const firstMessage = conversation.messages[0];
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  
  return lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
}

/**
 * Helper pour vérifier si une conversation est vide
 */
export function isEmptyConversation(conversation: Conversation): boolean {
  return conversation.messages.length === 0;
}

/**
 * Helper pour générer un titre de conversation à partir du contenu
 */
export function generateConversationTitle(conversation: Conversation): string {
  const firstUserMessage = conversation.messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'Nouvelle conversation';
  
  const title = firstUserMessage.content.substring(0, 50);
  return title.length < firstUserMessage.content.length ? title + '...' : title;
}
