/**
 * Quick Actions Configuration
 * Configuration des actions rapides disponibles dans le chat
 * Migré et amélioré depuis /frontend/src/config/quickActions.ts
 */

/**
 * Interface pour les informations de pièce jointe
 */
export interface AttachmentInfo {
  id: string;
  name: string;
  contentType?: string;
  content?: string;
  size?: number;
}

/**
 * Interface pour une Quick Action
 */
export interface QuickAction {
  actionKey: string;
  email?: boolean;
  attachment?: AttachmentInfo[];
}

/**
 * Interface pour la configuration d'une Quick Action
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
 * Dictionnaire des Quick Actions disponibles
 */
export const QUICK_ACTIONS_DICTIONARY: Record<string, QuickActionConfig> = {
  // ===== Actions de Génération =====
  
  generate: {
    label: 'Générer',
    userPrompt: 'Générer un nouvel email',
    llmPrompt: `You are an email composition assistant. Generate a professional email based on the user's request.

REQUIRED: Use the SAME LANGUAGE as specified in the user's request or context.

You will receive:
- User's instructions/comment about what to write
- Current email body (if any, for context)
- Desired tone (professional, friendly, formal, etc.)

Requirements:
- Write a complete, well-structured email
- Use appropriate greetings and closing
- Match the requested tone
- Be clear and concise
- Include all necessary information based on user's comment
- Adapt language to match the email context

IMPORTANT: If the user's instructions are vague or you need more information to write an appropriate email, ask specific questions like: "What is the main purpose of this email?" or "Who is the recipient?"`,
    icon: 'Sparkle',
    requiresEmail: false,
    category: 'generate',
    description: 'Génère un nouvel email à partir de vos instructions',
    shortcut: 'Ctrl+G'
  },

  reply: {
    label: 'Répondre',
    userPrompt: 'Générer une réponse à cet email',
    llmPrompt: `You are an email response assistant. Generate an appropriate reply to the received email.

REQUIRED: Use the SAME LANGUAGE as the original email.

You will receive:
- Original email subject and body
- Sender information
- Any additional context from the user
- Desired tone

Requirements:
- Address all points mentioned in the original email
- Maintain professional tone (unless specified otherwise)
- Include appropriate greeting referencing the sender
- Provide clear and complete answers
- End with an appropriate closing

IMPORTANT: If you need clarification on how to respond to specific points, ask the user.`,
    icon: 'Reply',
    requiresEmail: true,
    category: 'generate',
    description: 'Génère une réponse à l\'email reçu',
    shortcut: 'Ctrl+R'
  },

  // ===== Actions de Modification =====

  correct: {
    label: 'Corriger',
    userPrompt: 'Corriger l\'email',
    llmPrompt: `You are an email correction assistant. Correct spelling, grammar, and improve clarity.

REQUIRED: Maintain the SAME LANGUAGE as the original text.

You will receive:
- Email body to correct
- User's additional instructions (if any)

Requirements:
- Fix all spelling and grammar errors
- Improve sentence structure and clarity
- Maintain the original meaning and tone
- Keep the same level of formality
- Preserve the author's voice
- Do not add new information unless requested

Provide the corrected version directly without explanations unless errors are ambiguous.`,
    icon: 'CheckMark',
    requiresEmail: true,
    category: 'modify',
    description: 'Corrige les erreurs dans l\'email',
    shortcut: 'Ctrl+C'
  },

  reformulate: {
    label: 'Reformuler',
    userPrompt: 'Reformuler l\'email',
    llmPrompt: `You are an email reformulation assistant. Rewrite the email to improve style and impact.

REQUIRED: Maintain the SAME LANGUAGE as the original text.

You will receive:
- Email body to reformulate
- Desired tone (if specified)
- Additional instructions (if any)

Requirements:
- Preserve the core message and key information
- Improve clarity and readability
- Adjust tone if requested (more formal, friendly, etc.)
- Use more effective vocabulary and phrasing
- Maintain appropriate length (don't add unnecessary content)
- Keep the same structure unless improvement is needed

IMPORTANT: Focus on enhancing expression while keeping the original intent.`,
    icon: 'Sync',
    requiresEmail: true,
    category: 'modify',
    description: 'Reformule l\'email avec un meilleur style',
    shortcut: 'Ctrl+F'
  },

  // ===== Actions d'Analyse =====

  summarize: {
    label: 'Résumer',
    userPrompt: 'Résumer le contenu',
    llmPrompt: `You are a summarization assistant. Provide a clear and concise summary of the content.

REQUIRED: Use the SAME LANGUAGE as the original content.

You will receive either:
- Email body to summarize
- Attachment content to summarize
- Both

Requirements:
- Extract key points and main ideas
- Maintain factual accuracy
- Use bullet points for clarity
- Highlight action items if any
- Include important dates, numbers, or deadlines
- Keep summary concise (3-5 key points for emails, more for documents)

Format:
- Main Topic: [topic]
- Key Points:
  • [point 1]
  • [point 2]
  • [point 3]
- Action Items: [if any]
- Deadline: [if mentioned]`,
    icon: 'BulletedList',
    requiresEmail: false,
    category: 'analyze',
    description: 'Résume le contenu de l\'email ou des pièces jointes',
    shortcut: 'Ctrl+S'
  },

  translate: {
    label: 'Traduire',
    userPrompt: 'Traduire le texte',
    llmPrompt: `You are a professional translator. Translate the provided text accurately.

IMPORTANT: If the user hasn't specified the target language, ask them: "What language would you like me to translate this to?"

Requirements:
- Detect the source language automatically
- Maintain the original meaning and tone
- Use natural, idiomatic expressions in the target language
- Preserve formatting and structure
- Keep professional terminology accurate
- Return only the translated text

If the text contains ambiguous terms or cultural references that may not translate well, ask the user for clarification.`,
    icon: 'LocaleLanguage',
    requiresEmail: false,
    category: 'modify',
    description: 'Traduit l\'email dans une autre langue',
    shortcut: 'Ctrl+T'
  },

  // ===== Actions Avancées =====

  improve: {
    label: 'Améliorer',
    userPrompt: 'Améliorer l\'email',
    llmPrompt: `You are an email enhancement assistant. Significantly improve the email's quality and impact.

REQUIRED: Maintain the SAME LANGUAGE as the original text.

You will receive:
- Email body to improve
- Context and user instructions

Requirements:
- Enhance clarity and conciseness
- Strengthen the message and call-to-action
- Improve structure and flow
- Use more professional vocabulary
- Add appropriate transitions
- Ensure proper opening and closing
- Make the email more persuasive or engaging (as appropriate)

IMPORTANT: Transform a basic email into a polished, professional communication.`,
    icon: 'Lightbulb',
    requiresEmail: true,
    category: 'modify',
    description: 'Améliore significativement la qualité de l\'email'
  },

  shorten: {
    label: 'Raccourcir',
    userPrompt: 'Raccourcir l\'email',
    llmPrompt: `You are a conciseness expert. Make the email shorter while preserving essential information.

REQUIRED: Maintain the SAME LANGUAGE as the original text.

Requirements:
- Remove redundant information
- Combine similar points
- Use more concise phrasing
- Keep all critical information
- Maintain clarity and readability
- Preserve the original tone
- Aim for 30-50% reduction in length

Return the shortened version directly.`,
    icon: 'Collapse',
    requiresEmail: true,
    category: 'modify',
    description: 'Raccourcit l\'email tout en gardant l\'essentiel'
  },

  expand: {
    label: 'Développer',
    userPrompt: 'Développer l\'email',
    llmPrompt: `You are an email elaboration assistant. Expand the email with relevant details and context.

REQUIRED: Maintain the SAME LANGUAGE as the original text.

Requirements:
- Add relevant context and background
- Provide more detailed explanations
- Include examples if appropriate
- Expand on key points
- Maintain coherent flow
- Keep the same tone and formality
- Don't add unnecessary fluff

IMPORTANT: Add value through meaningful expansion, not just extra words.`,
    icon: 'Expand',
    requiresEmail: true,
    category: 'modify',
    description: 'Développe l\'email avec plus de détails'
  }
};

/**
 * Obtenir une quick action par sa clé
 */
export function getQuickAction(key: string): QuickActionConfig | undefined {
  return QUICK_ACTIONS_DICTIONARY[key];
}

/**
 * Obtenir toutes les quick actions disponibles
 */
export function getAllQuickActions(): QuickActionConfig[] {
  return Object.values(QUICK_ACTIONS_DICTIONARY);
}

/**
 * Obtenir les quick actions filtrées par contexte
 */
export function getQuickActionsByContext(
  hasEmail: boolean,
  hasAttachments: boolean
): QuickActionConfig[] {
  return getAllQuickActions().filter(action => {
    if (action.requiresEmail && !hasEmail) return false;
    if (action.requiresAttachments && !hasAttachments) return false;
    return true;
  });
}

/**
 * Obtenir les quick actions par catégorie
 */
export function getQuickActionsByCategory(
  category: 'generate' | 'modify' | 'analyze'
): QuickActionConfig[] {
  return getAllQuickActions().filter(action => action.category === category);
}

/**
 * Vérifier si une action nécessite du contexte email
 */
export function requiresEmailContext(actionKey: string): boolean {
  const action = getQuickAction(actionKey);
  return action?.requiresEmail === true;
}

/**
 * Catégories des quick actions
 */
export const QUICK_ACTION_CATEGORIES = {
  GENERATE: {
    key: 'generate',
    label: 'Génération',
    icon: 'Add',
    description: 'Actions pour créer du nouveau contenu'
  },
  MODIFY: {
    key: 'modify',
    label: 'Modification',
    icon: 'Edit',
    description: 'Actions pour modifier le contenu existant'
  },
  ANALYZE: {
    key: 'analyze',
    label: 'Analyse',
    icon: 'Analytics',
    description: 'Actions pour analyser et résumer'
  }
} as const;
