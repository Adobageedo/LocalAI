/**
 * Quick Action Domain Types
 * Types réexportés depuis config pour éviter la duplication
 * Migré depuis /frontend/src/config/quickActions.ts
 */

import { AttachmentInfo } from './attachment.types';

/**
 * Interface pour une Quick Action
 */
export interface QuickAction {
  actionKey: string;
  email?: boolean;
  attachment?: AttachmentInfo[];
}

/**
 * Configuration d'une Quick Action
 */
export interface QuickActionConfig {
  label: string;
  userPrompt: string;
  llmPrompt: string;
  icon: string;
  requiresEmail?: boolean;
  requiresAttachments?: boolean;
  category?: 'generate' | 'modify' | 'analyze';
  description?: string;
  shortcut?: string;
}

/**
 * Catégorie de Quick Action
 */
export type QuickActionCategory = 'generate' | 'modify' | 'analyze';

/**
 * Résultat d'exécution d'une Quick Action
 */
export interface QuickActionResult {
  actionKey: string;
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    generationTime?: number;
    model?: string;
  };
}

/**
 * Historique des Quick Actions
 */
export interface QuickActionHistory {
  id: string;
  userId: string;
  actionKey: string;
  timestamp: Date;
  success: boolean;
  context?: {
    emailSubject?: string;
    hasAttachment?: boolean;
    tone?: string;
  };
}

/**
 * Statistiques des Quick Actions
 */
export interface QuickActionStats {
  actionKey: string;
  totalUsageCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  lastUsedAt?: Date;
  usageByDay: {
    date: string;
    count: number;
  }[];
}

/**
 * Suggestion de Quick Action
 */
export interface QuickActionSuggestion {
  actionKey: string;
  reason: string;
  relevanceScore: number;
  context?: Record<string, any>;
}

/**
 * Helper pour vérifier si une action nécessite un email
 */
export function requiresEmailContent(action: QuickActionConfig): boolean {
  return action.requiresEmail === true;
}

/**
 * Helper pour vérifier si une action nécessite des pièces jointes
 */
export function requiresAttachments(action: QuickActionConfig): boolean {
  return action.requiresAttachments === true;
}

/**
 * Helper pour filtrer les actions disponibles selon le contexte
 */
export function getAvailableActions(
  allActions: Record<string, QuickActionConfig>,
  context: {
    hasEmail: boolean;
    hasAttachments: boolean;
  }
): QuickActionConfig[] {
  return Object.values(allActions).filter(action => {
    if (requiresEmailContent(action) && !context.hasEmail) {
      return false;
    }
    if (requiresAttachments(action) && !context.hasAttachments) {
      return false;
    }
    return true;
  });
}

/**
 * Helper pour obtenir les actions par catégorie
 */
export function getActionsByCategory(
  allActions: Record<string, QuickActionConfig>,
  category: QuickActionCategory
): QuickActionConfig[] {
  return Object.values(allActions).filter(action => action.category === category);
}

/**
 * Helper pour créer un historique d'action
 */
export function createActionHistory(
  userId: string,
  actionKey: string,
  success: boolean,
  context?: QuickActionHistory['context']
): QuickActionHistory {
  return {
    id: `history_${Date.now()}`,
    userId,
    actionKey,
    timestamp: new Date(),
    success,
    context
  };
}
