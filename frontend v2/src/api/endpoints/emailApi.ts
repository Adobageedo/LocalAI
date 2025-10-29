/**
 * Email API Endpoints
 * Endpoints pour les opérations email
 */

import { get, post } from '../client/apiClient';
import { API_ENDPOINTS } from '@/config/api';
import {
  GenerateEmailRequest,
  CorrectEmailRequest,
  ReformulateEmailRequest,
  SummarizeEmailRequest,
  EmailGenerationResponse
} from '@/models/domain';

/**
 * Générer un email
 */
export async function generateEmail(
  request: GenerateEmailRequest,
  token: string
): Promise<EmailGenerationResponse> {
  return post(API_ENDPOINTS.COMPOSE.GENERATE, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Générer un email avec streaming
 */
export async function generateEmailStream(
  request: GenerateEmailRequest,
  token: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  // Implementation du streaming SSE sera ajoutée
  // Pour l'instant, utiliser l'endpoint normal
  const response = await post(API_ENDPOINTS.COMPOSE.GENERATE_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  onChunk(response.content);
}

/**
 * Corriger un email
 */
export async function correctEmail(
  request: CorrectEmailRequest,
  token: string
): Promise<EmailGenerationResponse> {
  return post(API_ENDPOINTS.COMPOSE.CORRECT, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Corriger un email avec streaming
 */
export async function correctEmailStream(
  request: CorrectEmailRequest,
  token: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await post(API_ENDPOINTS.COMPOSE.CORRECT_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  onChunk(response.content);
}

/**
 * Reformuler un email
 */
export async function reformulateEmail(
  request: ReformulateEmailRequest,
  token: string
): Promise<EmailGenerationResponse> {
  return post(API_ENDPOINTS.COMPOSE.REFORMULATE, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Reformuler un email avec streaming
 */
export async function reformulateEmailStream(
  request: ReformulateEmailRequest,
  token: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await post(API_ENDPOINTS.COMPOSE.REFORMULATE_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  onChunk(response.content);
}

/**
 * Résumer un email
 */
export async function summarizeEmail(
  request: SummarizeEmailRequest,
  token: string
): Promise<EmailGenerationResponse> {
  return post(API_ENDPOINTS.READ.SUMMARIZE, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Résumer un email avec streaming
 */
export async function summarizeEmailStream(
  request: SummarizeEmailRequest,
  token: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await post(API_ENDPOINTS.READ.SUMMARIZE_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  onChunk(response.content);
}

/**
 * Analyser un email
 */
export async function analyzeEmail(
  emailId: string,
  token: string
): Promise<any> {
  return get(`${API_ENDPOINTS.READ.ANALYZE}/${emailId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Extraire des informations d'un email
 */
export async function extractEmailInfo(
  emailContent: string,
  token: string
): Promise<any> {
  return post(API_ENDPOINTS.READ.EXTRACT_INFO, { content: emailContent }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
