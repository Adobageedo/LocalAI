/**
 * Template Domain Types
 * Types et interfaces pour les templates d'email
 */

/**
 * Template d'email
 */
export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string;
  content: string;
  category: TemplateCategory;
  tags?: string[];
  
  // Métadonnées
  language?: string;
  tone?: string;
  variables?: TemplateVariable[];
  
  // Usage
  usageCount: number;
  lastUsedAt?: Date;
  
  // Flags
  isFavorite: boolean;
  isShared: boolean;
  isPublic: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Catégorie de template
 */
export type TemplateCategory = 
  | 'reply'
  | 'request'
  | 'follow_up'
  | 'meeting'
  | 'announcement'
  | 'thank_you'
  | 'apology'
  | 'introduction'
  | 'reminder'
  | 'custom';

/**
 * Variable de template
 */
export interface TemplateVariable {
  name: string;
  placeholder: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
  type?: 'text' | 'email' | 'date' | 'number';
}

/**
 * Requête de création de template
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: string;
  category: TemplateCategory;
  tags?: string[];
  language?: string;
  tone?: string;
  variables?: TemplateVariable[];
}

/**
 * Requête de mise à jour de template
 */
export interface UpdateTemplateRequest {
  id: string;
  name?: string;
  description?: string;
  content?: string;
  category?: TemplateCategory;
  tags?: string[];
  isFavorite?: boolean;
}

/**
 * Requête de génération à partir d'un template
 */
export interface GenerateFromTemplateRequest {
  templateId: string;
  variables?: Record<string, string>;
  tone?: string;
  language?: string;
  additionalInstructions?: string;
}

/**
 * Template utilisé récemment
 */
export interface RecentTemplate {
  templateId: string;
  template: Template;
  usedAt: Date;
  context?: {
    recipient?: string;
    subject?: string;
  };
}

/**
 * Catégorie de template avec métadonnées
 */
export interface TemplateCategoryInfo {
  key: TemplateCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  exampleCount?: number;
}

/**
 * Statistiques de template
 */
export interface TemplateStats {
  templateId: string;
  totalUsageCount: number;
  usageByMonth: {
    month: string;
    count: number;
  }[];
  averageSuccessRate?: number;
  lastUsedAt?: Date;
  createdAt: Date;
}

/**
 * Collection de templates
 */
export interface TemplateCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  templateIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filtre de templates
 */
export interface TemplateFilter {
  category?: TemplateCategory | TemplateCategory[];
  tags?: string[];
  language?: string;
  isFavorite?: boolean;
  searchQuery?: string;
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Résultat de recherche de templates
 */
export interface TemplateSearchResult {
  templates: Template[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Suggestion de template
 */
export interface TemplateSuggestion {
  template: Template;
  relevanceScore: number;
  reason: string;
}

/**
 * Helper pour créer un nouveau template
 */
export function createTemplate(data: CreateTemplateRequest, userId: string): Template {
  return {
    id: `template_${Date.now()}`,
    userId,
    name: data.name,
    description: data.description,
    content: data.content,
    category: data.category,
    tags: data.tags || [],
    language: data.language,
    tone: data.tone,
    variables: data.variables || [],
    usageCount: 0,
    isFavorite: false,
    isShared: false,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Helper pour extraire les variables d'un template
 */
export function extractVariables(content: string): TemplateVariable[] {
  const variablePattern = /\{\{(\w+)\}\}/g;
  const matches = content.matchAll(variablePattern);
  const variables: TemplateVariable[] = [];
  const seen = new Set<string>();
  
  for (const match of matches) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      variables.push({
        name,
        placeholder: `{{${name}}}`,
        required: true,
        type: 'text'
      });
    }
  }
  
  return variables;
}

/**
 * Helper pour remplacer les variables dans un template
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = variables[key];
    result = result.replaceAll(placeholder, value);
  });
  
  return result;
}

/**
 * Helper pour valider un template
 */
export function validateTemplate(template: Partial<Template>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Le nom du template est requis');
  }
  
  if (!template.content || template.content.trim().length === 0) {
    errors.push('Le contenu du template est requis');
  }
  
  if (!template.category) {
    errors.push('La catégorie est requise');
  }
  
  if (template.content && template.variables) {
    const extractedVars = extractVariables(template.content);
    const definedVarNames = template.variables.map(v => v.name);
    const missingVars = extractedVars.filter(v => !definedVarNames.includes(v.name));
    
    if (missingVars.length > 0) {
      errors.push(`Variables non définies: ${missingVars.map(v => v.name).join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper pour obtenir la catégorie info
 */
export function getCategoryInfo(category: TemplateCategory): TemplateCategoryInfo {
  const categories: Record<TemplateCategory, TemplateCategoryInfo> = {
    reply: {
      key: 'reply',
      label: 'Réponse',
      description: 'Templates pour répondre aux emails',
      icon: 'Reply',
      color: '#0078d4'
    },
    request: {
      key: 'request',
      label: 'Demande',
      description: 'Templates pour faire des demandes',
      icon: 'Help',
      color: '#d83b01'
    },
    follow_up: {
      key: 'follow_up',
      label: 'Relance',
      description: 'Templates pour relancer',
      icon: 'Follow',
      color: '#107c10'
    },
    meeting: {
      key: 'meeting',
      label: 'Réunion',
      description: 'Templates pour les réunions',
      icon: 'Calendar',
      color: '#5c2d91'
    },
    announcement: {
      key: 'announcement',
      label: 'Annonce',
      description: 'Templates pour les annonces',
      icon: 'Megaphone',
      color: '#d13438'
    },
    thank_you: {
      key: 'thank_you',
      label: 'Remerciement',
      description: 'Templates de remerciement',
      icon: 'Heart',
      color: '#b4009e'
    },
    apology: {
      key: 'apology',
      label: 'Excuses',
      description: 'Templates d\'excuses',
      icon: 'Sad',
      color: '#ffb900'
    },
    introduction: {
      key: 'introduction',
      label: 'Introduction',
      description: 'Templates de présentation',
      icon: 'People',
      color: '#00b7c3'
    },
    reminder: {
      key: 'reminder',
      label: 'Rappel',
      description: 'Templates de rappel',
      icon: 'Reminder',
      color: '#ff8c00'
    },
    custom: {
      key: 'custom',
      label: 'Personnalisé',
      description: 'Templates personnalisés',
      icon: 'EditCreate',
      color: '#605e5c'
    }
  };
  
  return categories[category];
}
