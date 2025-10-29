/**
 * Analytics Configuration
 * Configuration pour le tracking et l'analytics
 */

/**
 * Configuration générale de l'analytics
 */
export const ANALYTICS_CONFIG = {
  enabled: process.env.REACT_APP_ANALYTICS_ENABLED === 'true',
  debug: process.env.NODE_ENV === 'development',
  
  // Google Analytics
  googleAnalytics: {
    enabled: true,
    trackingId: process.env.REACT_APP_GA_TRACKING_ID || '',
    config: {
      anonymizeIp: true,
      cookieFlags: 'SameSite=None;Secure'
    }
  },
  
  // Custom Analytics
  customAnalytics: {
    enabled: true,
    endpoint: '/analytics/track'
  }
};

/**
 * Événements analytics
 */
export const ANALYTICS_EVENTS = {
  // Page Views
  PAGE_VIEW: 'page_view',
  
  // User Actions
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // Email Actions
  EMAIL_GENERATED: 'email_generated',
  EMAIL_CORRECTED: 'email_corrected',
  EMAIL_REFORMULATED: 'email_reformulated',
  EMAIL_SUMMARIZED: 'email_summarized',
  EMAIL_SENT: 'email_sent',
  EMAIL_INSERTED: 'email_inserted',
  
  // Template Actions
  TEMPLATE_CREATED: 'template_created',
  TEMPLATE_USED: 'template_used',
  TEMPLATE_SAVED: 'template_saved',
  TEMPLATE_DELETED: 'template_deleted',
  TEMPLATE_SHARED: 'template_shared',
  
  // Quick Actions
  QUICK_ACTION_CLICKED: 'quick_action_clicked',
  SUGGESTED_BUTTON_CLICKED: 'suggested_button_clicked',
  
  // Chat Actions
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_CONVERSATION_STARTED: 'chat_conversation_started',
  CHAT_CONVERSATION_ENDED: 'chat_conversation_ended',
  
  // UI Interactions
  BUTTON_CLICKED: 'button_clicked',
  LINK_CLICKED: 'link_clicked',
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',
  TAB_CHANGED: 'tab_changed',
  
  // File Actions
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  FILE_ANALYZED: 'file_analyzed',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  
  // Performance
  PERFORMANCE_MEASURED: 'performance_measured',
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  
  // Feature Usage
  FEATURE_USED: 'feature_used',
  BETA_FEATURE_ACCESSED: 'beta_feature_accessed',
  
  // Conversion
  CONVERSION_GOAL: 'conversion_goal',
  UPGRADE_CLICKED: 'upgrade_clicked',
  SUBSCRIPTION_PURCHASED: 'subscription_purchased'
} as const;

/**
 * Catégories d'événements
 */
export const EVENT_CATEGORIES = {
  USER: 'User',
  EMAIL: 'Email',
  TEMPLATE: 'Template',
  CHAT: 'Chat',
  UI: 'UI',
  FILE: 'File',
  ERROR: 'Error',
  PERFORMANCE: 'Performance',
  FEATURE: 'Feature',
  CONVERSION: 'Conversion'
} as const;

/**
 * Propriétés trackées automatiquement
 */
export const AUTO_TRACKED_PROPERTIES = {
  trackPageViews: true,
  trackUserInteractions: true,
  trackErrors: true,
  trackPerformance: false, // Peut impacter les performances
  trackScroll: false,
  trackClicks: true
};

/**
 * Propriétés utilisateur à tracker
 */
export const USER_PROPERTIES = {
  userId: 'user_id',
  userRole: 'user_role',
  subscriptionPlan: 'subscription_plan',
  signupDate: 'signup_date',
  lastLoginDate: 'last_login_date',
  preferredLanguage: 'preferred_language',
  preferredTone: 'preferred_tone'
} as const;

/**
 * Propriétés de session
 */
export const SESSION_PROPERTIES = {
  sessionId: 'session_id',
  sessionStart: 'session_start',
  deviceType: 'device_type',
  browser: 'browser',
  os: 'os',
  screenResolution: 'screen_resolution',
  viewport: 'viewport'
} as const;

/**
 * Métriques personnalisées
 */
export const CUSTOM_METRICS = {
  // Email metrics
  emailGenerationTime: 'email_generation_time',
  emailLength: 'email_length',
  emailToneUsed: 'email_tone_used',
  
  // Template metrics
  templateUsageCount: 'template_usage_count',
  templateCategories: 'template_categories',
  
  // Chat metrics
  chatMessagesPerSession: 'chat_messages_per_session',
  chatSessionDuration: 'chat_session_duration',
  suggestedButtonsClicked: 'suggested_buttons_clicked',
  
  // Performance metrics
  apiCallDuration: 'api_call_duration',
  streamingLatency: 'streaming_latency',
  cacheHitRate: 'cache_hit_rate',
  
  // User engagement
  sessionDuration: 'session_duration',
  pagesPerSession: 'pages_per_session',
  actionsPerSession: 'actions_per_session',
  returnVisitor: 'return_visitor'
} as const;

/**
 * Dimensions personnalisées
 */
export const CUSTOM_DIMENSIONS = {
  userRole: 'dimension1',
  subscriptionPlan: 'dimension2',
  emailTone: 'dimension3',
  templateCategory: 'dimension4',
  quickActionType: 'dimension5',
  featureFlag: 'dimension6'
} as const;

/**
 * Goals de conversion
 */
export const CONVERSION_GOALS = {
  SIGNUP_COMPLETED: {
    id: 'goal_signup',
    value: 0,
    category: 'User Acquisition'
  },
  FIRST_EMAIL_GENERATED: {
    id: 'goal_first_email',
    value: 0,
    category: 'Activation'
  },
  TEMPLATE_CREATED: {
    id: 'goal_template',
    value: 0,
    category: 'Engagement'
  },
  PREMIUM_UPGRADE: {
    id: 'goal_upgrade',
    value: 1,
    category: 'Revenue'
  },
  WEEKLY_ACTIVE_USER: {
    id: 'goal_wau',
    value: 0,
    category: 'Retention'
  }
} as const;

/**
 * Configuration du sampling
 */
export const SAMPLING_CONFIG = {
  enabled: true,
  rates: {
    pageViews: 1.0, // 100% des page views
    events: 1.0, // 100% des événements
    errors: 1.0, // 100% des erreurs
    performance: 0.1 // 10% des métriques de performance
  }
};

/**
 * Configuration de la confidentialité
 */
export const PRIVACY_CONFIG = {
  anonymizeIp: true,
  respectDoNotTrack: true,
  cookieConsent: true,
  dataRetentionDays: 365,
  allowPersonalData: false,
  maskSensitiveData: true
};

/**
 * Données à exclure du tracking
 */
export const EXCLUDE_FROM_TRACKING = {
  paths: [
    '/admin',
    '/test',
    '/debug'
  ],
  queryParams: [
    'token',
    'api_key',
    'session_id',
    'password'
  ],
  events: [
    // Événements trop fréquents
    'mouse_move',
    'scroll_position'
  ]
};

/**
 * Configuration du batch processing
 */
export const BATCH_CONFIG = {
  enabled: true,
  maxBatchSize: 20,
  flushInterval: 10000, // 10 secondes
  maxRetries: 3
};

/**
 * Environnements où l'analytics est désactivé
 */
export const ANALYTICS_DISABLED_ENVS = [
  'test',
  'development' // Optionnel, selon les besoins
];

/**
 * Vérifier si l'analytics est activé pour l'environnement actuel
 */
export function isAnalyticsEnabled(): boolean {
  const env = process.env.NODE_ENV || 'development';
  return (
    ANALYTICS_CONFIG.enabled &&
    !ANALYTICS_DISABLED_ENVS.includes(env) &&
    !navigator.doNotTrack
  );
}

/**
 * Obtenir la configuration pour l'environnement actuel
 */
export function getAnalyticsConfig() {
  return {
    ...ANALYTICS_CONFIG,
    enabled: isAnalyticsEnabled()
  };
}
