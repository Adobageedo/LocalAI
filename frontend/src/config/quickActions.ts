/**
 * Quick Actions Dictionary
 * Maps action labels to user display text and LLM system prompts
 */

export interface QuickActionConfig {
  label: string;
  userPrompt: string;        // Text shown to user
  llmPrompt: string;          // Detailed instruction sent to LLM
  icon?: string;              // Optional Fluent UI icon name
  requiresEmail?: boolean;    // Requires email context
  requiresAttachments?: boolean; // Requires attachments
}

export const QUICK_ACTIONS_DICTIONARY: Record<string, QuickActionConfig> = {
  reply: {
    label: 'Répondre',
    userPrompt: 'Rédiger une réponse professionnelle',
    llmPrompt: `You are an email assistant. Write a professional response to the email provided in the context.

Requirements:
- Maintain a professional and courteous tone
- Address all points mentioned in the original email
- Keep the response concise and clear
- Use appropriate greetings and sign-offs
- Match the language and formality level of the original email`,
    icon: 'Reply',
    requiresEmail: true
  },

  correct: {
    label: 'Corriger',
    userPrompt: 'Corriger les fautes et améliorer la formulation',
    llmPrompt: `You are a professional text editor. Correct and improve the provided text.

Tasks:
- Fix all spelling and grammar errors
- Improve sentence structure and clarity
- Enhance vocabulary while maintaining the original meaning
- Ensure proper punctuation and formatting
- Keep the same tone and style as the original
- Return only the corrected text without explanations`,
    icon: 'CheckMark'
  },

  reformulate: {
    label: 'Reformuler',
    userPrompt: 'Reformuler avec un ton plus fluide',
    llmPrompt: `You are a writing enhancement specialist. Reformulate the provided text to make it more natural and fluid.

Goals:
- Improve readability and flow
- Make the text sound more natural and conversational (while staying professional)
- Simplify complex sentences where appropriate
- Maintain the core message and key information
- Adjust tone to be more engaging
- Return only the reformulated text`,
    icon: 'Edit'
  },

  summarize: {
    label: 'Synthétiser',
    userPrompt: 'Synthétiser le contenu sélectionné',
    llmPrompt: `You are a content summarization expert. Create a concise summary of the provided content.

Instructions:
- Extract the main points and key information
- Organize information in a logical structure
- Use bullet points or short paragraphs
- Maintain factual accuracy
- Include only essential details
- Keep the summary brief but comprehensive (max 200 words)`,
    icon: 'BulletedList',
    requiresEmail: true,
    requiresAttachments: true
  },

  translate: {
    label: 'Traduire',
    userPrompt: 'Traduire le texte',
    llmPrompt: `You are a professional translator. Translate the provided text accurately.

Requirements:
- Maintain the original meaning and tone
- Use natural, idiomatic expressions in the target language
- Preserve formatting and structure
- Keep professional terminology accurate
- Return only the translated text`,
    icon: 'LocaleLanguage'
  }
};

/**
 * Get quick action configuration by label key
 */
export function getQuickAction(key: string): QuickActionConfig | undefined {
  return QUICK_ACTIONS_DICTIONARY[key];
}

/**
 * Get all available quick actions as an array
 */
export function getAllQuickActions(): QuickActionConfig[] {
  return Object.values(QUICK_ACTIONS_DICTIONARY);
}

/**
 * Get quick actions filtered by requirements
 */
export function getQuickActionsByContext(hasEmail: boolean, hasAttachments: boolean): QuickActionConfig[] {
  return getAllQuickActions().filter(action => {
    if (action.requiresEmail && !hasEmail) return false;
    if (action.requiresAttachments && !hasAttachments) return false;
    return true;
  });
}
