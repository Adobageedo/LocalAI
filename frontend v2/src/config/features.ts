/**
 * Feature Flags
 * Configuration pour activer/désactiver des fonctionnalités
 */

/**
 * Feature flags globaux
 */
export const FEATURES = {
  // ===== Chat Features =====
  ENABLE_SUGGESTED_BUTTONS: true, // Afficher les boutons suggérés par l'IA
  ENABLE_DOUBLE_CLICK_SEND: true, // Double-clic pour envoyer les boutons suggérés
  ENABLE_CONVERSATION_HISTORY: true, // Sauvegarder l'historique des conversations
  ENABLE_CHAT_STREAMING: true, // Streaming des réponses chat
  ENABLE_CONTEXT_AWARENESS: true, // Prise en compte du contexte dans les conversations
  
  // ===== Email Features =====
  ENABLE_STYLE_ANALYSIS: true, // Analyse du style d'écriture de l'utilisateur
  ENABLE_RAG: false, // Retrieval Augmented Generation (désactivé pour l'instant)
  ENABLE_EMAIL_STREAMING: true, // Streaming de la génération d'emails
  ENABLE_AUTO_REFRESH: true, // Rafraîchissement automatique du contenu email
  ENABLE_EMAIL_CORRECTION: true, // Correction d'emails
  ENABLE_EMAIL_REFORMULATION: true, // Reformulation d'emails
  ENABLE_EMAIL_SUMMARY: true, // Résumé d'emails
  ENABLE_REPLY_GENERATION: true, // Génération de réponses
  
  // ===== Template Features =====
  ENABLE_TEMPLATE_SYSTEM: true, // Système de templates
  ENABLE_TEMPLATE_CATEGORIES: true, // Catégories de templates
  ENABLE_CUSTOM_TEMPLATES: true, // Templates personnalisés
  ENABLE_TEMPLATE_SHARING: false, // Partage de templates (future feature)
  
  // ===== Attachment Features =====
  ENABLE_ATTACHMENT_ANALYSIS: true, // Analyse du contenu des pièces jointes
  ENABLE_FILE_PREVIEW: true, // Prévisualisation des fichiers
  ENABLE_OCR: false, // OCR pour les images (future feature)
  
  // ===== UI Features =====
  ENABLE_DARK_MODE: false, // Mode sombre (future feature)
  ENABLE_ANIMATIONS: true, // Animations UI
  ENABLE_TOOLTIPS: true, // Tooltips d'aide
  ENABLE_KEYBOARD_SHORTCUTS: true, // Raccourcis clavier
  ENABLE_RESPONSIVE_DESIGN: true, // Design responsive
  ENABLE_ACCESSIBILITY: true, // Features d'accessibilité
  
  // ===== Performance =====
  ENABLE_LAZY_LOADING: true, // Chargement paresseux des composants
  ENABLE_CODE_SPLITTING: true, // Splitting du code
  ENABLE_IMAGE_OPTIMIZATION: true, // Optimisation des images
  ENABLE_CACHING: true, // Cache des requêtes API
  
  // ===== Analytics & Monitoring =====
  ENABLE_ANALYTICS: false, // Analytics (Google Analytics, etc.)
  ENABLE_ERROR_REPORTING: true, // Reporting d'erreurs
  ENABLE_PERFORMANCE_MONITORING: false, // Monitoring de performance
  ENABLE_USER_FEEDBACK: true, // Système de feedback utilisateur
  
  // ===== Security =====
  ENABLE_TWO_FACTOR_AUTH: false, // Authentification à deux facteurs (future)
  ENABLE_SESSION_TIMEOUT: true, // Timeout de session
  ENABLE_CSRF_PROTECTION: true, // Protection CSRF
  
  // ===== Development & Debug =====
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_CONSOLE_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_REDUX_DEVTOOLS: process.env.NODE_ENV === 'development',
  ENABLE_REACT_QUERY_DEVTOOLS: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_API: false, // Utiliser des données mockées
  
  // ===== Experimental =====
  ENABLE_VOICE_INPUT: false, // Entrée vocale (expérimental)
  ENABLE_TRANSLATION: false, // Traduction automatique (expérimental)
  ENABLE_AI_SUGGESTIONS: true, // Suggestions IA en temps réel
  ENABLE_SMART_COMPOSE: true // Composition intelligente
};

/**
 * Feature access basé sur le rôle utilisateur
 */
export const FEATURE_ACCESS = {
  // Admin a accès à tout
  admin: ['*'],
  
  // Premium a accès aux features avancées
  premium: [
    'style_analysis',
    'rag',
    'advanced_templates',
    'template_categories',
    'custom_templates',
    'attachment_analysis',
    'unlimited_generations',
    'priority_support',
    'export_history',
    'advanced_analytics'
  ],
  
  // Free a accès aux features de base
  free: [
    'basic_generation',
    'correction',
    'reformulation',
    'basic_templates',
    'limited_generations' // ex: 50 par mois
  ]
};

/**
 * Limites par rôle utilisateur
 */
export const ROLE_LIMITS = {
  free: {
    maxGenerationsPerDay: 10,
    maxGenerationsPerMonth: 50,
    maxTemplates: 5,
    maxAttachmentSize: 5 * 1024 * 1024, // 5MB
    maxConversationHistory: 10
  },
  
  premium: {
    maxGenerationsPerDay: 100,
    maxGenerationsPerMonth: 1000,
    maxTemplates: 50,
    maxAttachmentSize: 20 * 1024 * 1024, // 20MB
    maxConversationHistory: 100
  },
  
  admin: {
    maxGenerationsPerDay: Infinity,
    maxGenerationsPerMonth: Infinity,
    maxTemplates: Infinity,
    maxAttachmentSize: 50 * 1024 * 1024, // 50MB
    maxConversationHistory: Infinity
  }
};

/**
 * Vérifier si une feature est activée
 */
export const isFeatureEnabled = (featureName: keyof typeof FEATURES): boolean => {
  return FEATURES[featureName] === true;
};

/**
 * Vérifier si un utilisateur a accès à une feature
 */
export const hasFeatureAccess = (userRole: keyof typeof FEATURE_ACCESS, featureName: string): boolean => {
  const roleAccess = FEATURE_ACCESS[userRole] || FEATURE_ACCESS.free;
  return roleAccess.includes('*') || roleAccess.includes(featureName);
};

/**
 * Obtenir les limites pour un rôle
 */
export const getRoleLimits = (userRole: keyof typeof ROLE_LIMITS) => {
  return ROLE_LIMITS[userRole] || ROLE_LIMITS.free;
};

/**
 * Configuration des features par environnement
 */
export const ENV_FEATURES = {
  development: {
    ...FEATURES,
    ENABLE_DEBUG_MODE: true,
    ENABLE_CONSOLE_LOGS: true,
    ENABLE_MOCK_API: false
  },
  
  staging: {
    ...FEATURES,
    ENABLE_DEBUG_MODE: true,
    ENABLE_CONSOLE_LOGS: false,
    ENABLE_ANALYTICS: false
  },
  
  production: {
    ...FEATURES,
    ENABLE_DEBUG_MODE: false,
    ENABLE_CONSOLE_LOGS: false,
    ENABLE_ANALYTICS: true,
    ENABLE_ERROR_REPORTING: true
  }
};

/**
 * Obtenir la configuration des features pour l'environnement actuel
 */
export const getCurrentEnvFeatures = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_FEATURES[env as keyof typeof ENV_FEATURES] || ENV_FEATURES.development;
};

/**
 * Features beta (accessibles uniquement avec un flag)
 */
export const BETA_FEATURES = {
  VOICE_INPUT: 'voice_input',
  TRANSLATION: 'translation',
  AI_COACH: 'ai_coach',
  TEAM_COLLABORATION: 'team_collaboration'
};

/**
 * Vérifier si une beta feature est activée pour l'utilisateur
 */
export const hasBetaAccess = (userId: string, betaFeature: string): boolean => {
  // À implémenter avec un système de beta testers
  // Pour l'instant, désactivé pour tous
  return false;
};
