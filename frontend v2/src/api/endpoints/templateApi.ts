/**
 * Template API Endpoints
 * Endpoints pour les templates d'email
 */

import { get, post, put, del } from '../client/apiClient';
import { API_ENDPOINTS } from '@/config/api';
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GenerateFromTemplateRequest,
  TemplateSearchResult
} from '@/models/domain';

/**
 * Obtenir tous les templates
 */
export async function getTemplates(
  token: string,
  params?: { page?: number; pageSize?: number; category?: string }
): Promise<TemplateSearchResult> {
  return get(API_ENDPOINTS.TEMPLATES.LIST, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Obtenir un template par ID
 */
export async function getTemplateById(
  id: string,
  token: string
): Promise<Template> {
  const url = API_ENDPOINTS.TEMPLATES.GET.replace(':id', id);
  return get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Créer un template
 */
export async function createTemplate(
  data: CreateTemplateRequest,
  token: string
): Promise<Template> {
  return post(API_ENDPOINTS.TEMPLATES.CREATE, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Mettre à jour un template
 */
export async function updateTemplate(
  data: UpdateTemplateRequest,
  token: string
): Promise<Template> {
  const url = API_ENDPOINTS.TEMPLATES.UPDATE.replace(':id', data.id);
  return put(url, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Supprimer un template
 */
export async function deleteTemplate(
  id: string,
  token: string
): Promise<void> {
  const url = API_ENDPOINTS.TEMPLATES.DELETE.replace(':id', id);
  return del(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Générer depuis un template
 */
export async function generateFromTemplate(
  request: GenerateFromTemplateRequest,
  token: string
): Promise<{ content: string }> {
  return post(API_ENDPOINTS.TEMPLATES.GENERATE, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Générer depuis un template avec streaming
 */
export async function generateFromTemplateStream(
  request: GenerateFromTemplateRequest,
  token: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await post(API_ENDPOINTS.TEMPLATES.GENERATE_STREAM, request, {
    headers: { Authorization: `Bearer ${token}` }
  });
  onChunk(response.content);
}

/**
 * Obtenir les catégories de templates
 */
export async function getTemplateCategories(
  token: string
): Promise<string[]> {
  return get(API_ENDPOINTS.TEMPLATES.CATEGORIES, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
