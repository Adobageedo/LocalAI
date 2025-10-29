/**
 * Chat API Endpoints
 * Endpoints pour le système de chat/conversation
 */

import { get, post } from '../client/apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { ChatRequest, ChatResponse, Conversation } from '@/models/domain';

/**
 * Envoyer un message au chat
 */
export async function sendChatMessage(
  request: ChatRequest,
  token: string
): Promise<ChatResponse> {
  return post(API_ENDPOINTS.CHAT.PROMPT, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Envoyer un message au chat avec streaming
 */
export async function sendChatMessageStream(
  request: ChatRequest,
  token: string,
  onChunk: (chunk: string) => void,
  onComplete?: () => void
): Promise<void> {
  // Implementation du streaming SSE
  const response = await post(API_ENDPOINTS.CHAT.PROMPT_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  onChunk(response.content);
  onComplete?.();
}

/**
 * Obtenir une conversation
 */
export async function getConversation(
  conversationId: string,
  token: string
): Promise<Conversation> {
  return get(`${API_ENDPOINTS.CHAT.CONVERSATION}/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Obtenir l'historique des conversations
 */
export async function getConversationHistory(
  token: string,
  params?: { limit?: number; offset?: number }
): Promise<Conversation[]> {
  return get(API_ENDPOINTS.CHAT.HISTORY, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Supprimer une conversation
 */
export async function deleteConversation(
  conversationId: string,
  token: string
): Promise<void> {
  return post(`${API_ENDPOINTS.CHAT.CONVERSATION}/${conversationId}/delete`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Archiver une conversation
 */
export async function archiveConversation(
  conversationId: string,
  token: string
): Promise<void> {
  return post(`${API_ENDPOINTS.CHAT.CONVERSATION}/${conversationId}/archive`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
