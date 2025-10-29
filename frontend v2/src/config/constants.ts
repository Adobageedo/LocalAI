/**
 * Application Constants
 * Constantes globales utilisées dans toute l'application
 */

/**
 * Limites et restrictions
 */
export const LIMITS = {
  // Fichiers
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS: 5,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Texte
  MAX_MESSAGE_LENGTH: 5000,
  MAX_TEMPLATE_LENGTH: 10000,
  MAX_SUBJECT_LENGTH: 200,
  MAX_BODY_LENGTH: 50000,
  MIN_SUBJECT_LENGTH: 1,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Email
  MAX_RECIPIENTS: 50,
  MAX_CC: 20,
  MAX_BCC: 20,
  
  // UI
  AUTO_REFRESH_INTERVAL: 5000, // 5 secondes
  TOAST_DURATION: 3000, // 3 secondes
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 1000, // 1 seconde
  TYPING_INDICATOR_DELAY: 500, // 500ms
  AUTO_SAVE_DELAY: 2000, // 2 secondes
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Cache
  CACHE_TTL: 300000, // 5 minutes
  SESSION_TIMEOUT: 3600000, // 1 heure
  
  // Retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 seconde
};

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  // Réseau et serveur
  NETWORK_ERROR: 'Erreur de connexion au serveur. Veuillez vérifier votre connexion internet.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
  TIMEOUT_ERROR: 'La requête a pris trop de temps. Veuillez réessayer.',
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite.',
  
  // Authentification
  UNAUTHORIZED: 'Session expirée. Veuillez vous reconnecter.',
  FORBIDDEN: 'Vous n\'avez pas les permissions nécessaires.',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  EMAIL_ALREADY_EXISTS: 'Cet email est déjà utilisé.',
  
  // Validation
  REQUIRED_FIELD: 'Ce champ est requis.',
  INVALID_EMAIL: 'Format d\'email invalide.',
  INVALID_PASSWORD: 'Le mot de passe doit contenir au moins 8 caractères.',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas.',
  
  // Fichiers
  FILE_TOO_LARGE: 'Le fichier est trop volumineux. Taille maximale: {max}MB.',
  INVALID_FILE_TYPE: 'Type de fichier non supporté.',
  UPLOAD_FAILED: 'Échec du téléchargement du fichier.',
  TOO_MANY_FILES: 'Nombre maximum de fichiers atteint ({max}).',
  
  // Email
  NO_EMAIL_CONTENT: 'Aucun contenu email trouvé.',
  NO_EMAIL_SELECTED: 'Aucun email sélectionné.',
  EMPTY_SUBJECT: 'Le sujet ne peut pas être vide.',
  EMPTY_BODY: 'Le corps de l\'email ne peut pas être vide.',
  INVALID_RECIPIENT: 'Adresse email du destinataire invalide.',
  
  // Génération
  GENERATION_FAILED: 'Échec de la génération. Veuillez réessayer.',
  CORRECTION_FAILED: 'Échec de la correction. Veuillez réessayer.',
  REFORMULATION_FAILED: 'Échec de la reformulation. Veuillez réessayer.',
  SUMMARIZATION_FAILED: 'Échec du résumé. Veuillez réessayer.',
  
  // Template
  TEMPLATE_NOT_FOUND: 'Template introuvable.',
  TEMPLATE_SAVE_FAILED: 'Échec de la sauvegarde du template.',
  TEMPLATE_DELETE_FAILED: 'Échec de la suppression du template.',
  
  // Outlook
  OUTLOOK_NOT_INITIALIZED: 'Outlook n\'est pas initialisé.',
  OUTLOOK_INSERT_FAILED: 'Échec de l\'insertion dans Outlook.',
  OUTLOOK_READ_FAILED: 'Impossible de lire le contenu depuis Outlook.',
  
  // Attachments
  ATTACHMENT_LOAD_FAILED: 'Échec du chargement de la pièce jointe.',
  ATTACHMENT_PARSE_FAILED: 'Impossible de lire le contenu de la pièce jointe.'
};

/**
 * Messages de succès standardisés
 */
export const SUCCESS_MESSAGES = {
  // Email
  EMAIL_GENERATED: 'Email généré avec succès !',
  EMAIL_CORRECTED: 'Email corrigé avec succès !',
  EMAIL_REFORMULATED: 'Email reformulé avec succès !',
  EMAIL_SUMMARIZED: 'Email résumé avec succès !',
  EMAIL_SENT: 'Email envoyé avec succès !',
  EMAIL_INSERTED: 'Email inséré dans Outlook avec succès !',
  
  // Template
  TEMPLATE_SAVED: 'Template sauvegardé avec succès !',
  TEMPLATE_DELETED: 'Template supprimé avec succès !',
  TEMPLATE_UPDATED: 'Template mis à jour avec succès !',
  TEMPLATE_GENERATED: 'Template généré avec succès !',
  
  // Auth
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie !',
  REGISTER_SUCCESS: 'Inscription réussie ! Vérifiez votre email.',
  PASSWORD_RESET_SENT: 'Email de réinitialisation envoyé !',
  PASSWORD_UPDATED: 'Mot de passe mis à jour avec succès !',
  
  // General
  SAVED: 'Sauvegardé avec succès !',
  UPDATED: 'Mis à jour avec succès !',
  DELETED: 'Supprimé avec succès !',
  COPIED_TO_CLIPBOARD: 'Copié dans le presse-papiers !',
  FILE_UPLOADED: 'Fichier téléchargé avec succès !',
  
  // Settings
  PREFERENCES_SAVED: 'Préférences sauvegardées !',
  PROFILE_UPDATED: 'Profil mis à jour !'
};

/**
 * Messages d'information
 */
export const INFO_MESSAGES = {
  LOADING: 'Chargement en cours...',
  GENERATING: 'Génération en cours...',
  PROCESSING: 'Traitement en cours...',
  SAVING: 'Sauvegarde en cours...',
  UPLOADING: 'Téléchargement en cours...',
  ANALYZING: 'Analyse en cours...',
  STREAMING: 'Réception en cours...',
  
  NO_DATA: 'Aucune donnée disponible.',
  NO_RESULTS: 'Aucun résultat trouvé.',
  EMPTY_LIST: 'La liste est vide.',
  
  FIRST_TIME_USER: 'Bienvenue ! Commencez par générer votre premier email.',
  UNSAVED_CHANGES: 'Vous avez des modifications non sauvegardées.'
};

/**
 * Timeouts et délais
 */
export const TIMEOUTS = {
  // UI
  TOAST_DURATION: 3000, // 3 secondes
  TOOLTIP_DELAY: 500, // 500ms
  MODAL_ANIMATION: 300, // 300ms
  
  // Input
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 1000, // 1 seconde
  TYPING_INDICATOR_DELAY: 500, // 500ms
  
  // Auto-save
  AUTO_SAVE_DELAY: 2000, // 2 secondes
  AUTO_REFRESH_DELAY: 5000, // 5 secondes
  
  // API
  API_TIMEOUT: 30000, // 30 secondes
  STREAM_TIMEOUT: 60000, // 60 secondes
  UPLOAD_TIMEOUT: 120000, // 2 minutes
  
  // Session
  SESSION_CHECK_INTERVAL: 60000, // 1 minute
  IDLE_TIMEOUT: 1800000 // 30 minutes
};

/**
 * Expressions régulières pour validation
 */
export const VALIDATION_REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^[0-9]+$/
};

/**
 * Codes de statut HTTP
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * Clés de stockage local
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  CONVERSATION_HISTORY: 'conversation_history',
  DRAFT_EMAILS: 'draft_emails',
  RECENT_TEMPLATES: 'recent_templates',
  RECENT_ACTIONS: 'recent_actions'
};

/**
 * Types de ton disponibles
 */
export const TONE_TYPES = {
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  FORMAL: 'formal',
  CASUAL: 'casual',
  URGENT: 'urgent',
  APOLOGETIC: 'apologetic'
} as const;

/**
 * Catégories de templates
 */
export const TEMPLATE_CATEGORIES = {
  REPLY: 'reply',
  REQUEST: 'request',
  FOLLOW_UP: 'follow_up',
  MEETING: 'meeting',
  ANNOUNCEMENT: 'announcement',
  THANK_YOU: 'thank_you',
  APOLOGY: 'apology',
  CUSTOM: 'custom'
} as const;

/**
 * Rôles utilisateur
 */
export const USER_ROLES = {
  FREE: 'free',
  PREMIUM: 'premium',
  ADMIN: 'admin'
} as const;

/**
 * Niveaux de log
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

/**
 * Événements analytics
 */
export const ANALYTICS_EVENTS = {
  EMAIL_GENERATED: 'email_generated',
  EMAIL_CORRECTED: 'email_corrected',
  EMAIL_REFORMULATED: 'email_reformulated',
  EMAIL_SUMMARIZED: 'email_summarized',
  TEMPLATE_USED: 'template_used',
  TEMPLATE_SAVED: 'template_saved',
  BUTTON_CLICKED: 'button_clicked',
  PAGE_VIEWED: 'page_viewed',
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login'
} as const;
