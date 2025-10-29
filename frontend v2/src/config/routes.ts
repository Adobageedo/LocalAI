/**
 * Routes Configuration
 * Configuration centralisée de toutes les routes de l'application
 */

/**
 * Routes de l'application
 */
export const ROUTES = {
  HOME: '/',
  
  // Authentification
  AUTH: {
    BASE: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email'
  },

  // Email
  EMAIL: {
    BASE: '/email',
    COMPOSE: '/email/compose',
    READ: '/email/read',
    TEMPLATES: '/email/templates',
    TEMPLATE_DETAIL: '/email/templates/:id',
    DRAFTS: '/email/drafts'
  },

  // Templates
  TEMPLATES: {
    BASE: '/templates',
    LIST: '/templates',
    CREATE: '/templates/create',
    EDIT: '/templates/:id/edit',
    DETAIL: '/templates/:id'
  },

  // Utilisateur
  USER: {
    BASE: '/user',
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    PREFERENCES: '/user/preferences',
    SUBSCRIPTION: '/user/subscription'
  },

  // Paramètres
  SETTINGS: {
    BASE: '/settings',
    GENERAL: '/settings/general',
    ACCOUNT: '/settings/account',
    PREFERENCES: '/settings/preferences',
    NOTIFICATIONS: '/settings/notifications',
    SECURITY: '/settings/security',
    PRIVACY: '/settings/privacy'
  },

  // Help & Support
  HELP: {
    BASE: '/help',
    FAQ: '/help/faq',
    DOCUMENTATION: '/help/docs',
    CONTACT: '/help/contact',
    FEEDBACK: '/help/feedback'
  },

  // Admin (future)
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    ANALYTICS: '/admin/analytics',
    SETTINGS: '/admin/settings'
  },

  // Erreurs
  ERROR: {
    NOT_FOUND: '/404',
    UNAUTHORIZED: '/401',
    FORBIDDEN: '/403',
    SERVER_ERROR: '/500'
  }
} as const;

/**
 * Routes publiques (accessibles sans authentification)
 */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.REGISTER,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
  ROUTES.AUTH.VERIFY_EMAIL,
  ROUTES.ERROR.NOT_FOUND,
  ROUTES.ERROR.UNAUTHORIZED,
  ROUTES.ERROR.FORBIDDEN,
  ROUTES.ERROR.SERVER_ERROR
] as const;

/**
 * Routes privées (nécessitent une authentification)
 */
export const PRIVATE_ROUTES = [
  ROUTES.EMAIL.COMPOSE,
  ROUTES.EMAIL.READ,
  ROUTES.EMAIL.TEMPLATES,
  ROUTES.EMAIL.DRAFTS,
  ROUTES.TEMPLATES.LIST,
  ROUTES.TEMPLATES.CREATE,
  ROUTES.USER.PROFILE,
  ROUTES.USER.SETTINGS,
  ROUTES.USER.PREFERENCES,
  ROUTES.USER.SUBSCRIPTION,
  ROUTES.SETTINGS.BASE,
  ROUTES.HELP.BASE
] as const;

/**
 * Routes admin (nécessitent rôle admin)
 */
export const ADMIN_ROUTES = [
  ROUTES.ADMIN.DASHBOARD,
  ROUTES.ADMIN.USERS,
  ROUTES.ADMIN.ANALYTICS,
  ROUTES.ADMIN.SETTINGS
] as const;

/**
 * Titres des pages
 */
export const PAGE_TITLES = {
  [ROUTES.HOME]: 'Accueil',
  [ROUTES.AUTH.LOGIN]: 'Connexion',
  [ROUTES.AUTH.REGISTER]: 'Inscription',
  [ROUTES.AUTH.FORGOT_PASSWORD]: 'Mot de passe oublié',
  [ROUTES.AUTH.RESET_PASSWORD]: 'Réinitialiser le mot de passe',
  [ROUTES.EMAIL.COMPOSE]: 'Composer un email',
  [ROUTES.EMAIL.READ]: 'Lire un email',
  [ROUTES.EMAIL.TEMPLATES]: 'Templates',
  [ROUTES.TEMPLATES.LIST]: 'Mes templates',
  [ROUTES.TEMPLATES.CREATE]: 'Créer un template',
  [ROUTES.USER.PROFILE]: 'Mon profil',
  [ROUTES.USER.SETTINGS]: 'Paramètres',
  [ROUTES.SETTINGS.GENERAL]: 'Paramètres généraux',
  [ROUTES.HELP.FAQ]: 'FAQ',
  [ROUTES.ERROR.NOT_FOUND]: 'Page introuvable'
} as const;

/**
 * Helper pour construire une route avec des paramètres
 */
export function buildRoute(route: string, params: Record<string, string | number>): string {
  let result = route;
  Object.keys(params).forEach(key => {
    result = result.replace(`:${key}`, String(params[key]));
  });
  return result;
}

/**
 * Helper pour vérifier si une route est publique
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.includes(':')) {
      // Pour les routes avec paramètres, vérifier le pattern
      const pattern = route.split('/').slice(0, -1).join('/');
      return path.startsWith(pattern);
    }
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Helper pour vérifier si une route nécessite l'authentification
 */
export function requiresAuth(path: string): boolean {
  return !isPublicRoute(path);
}

/**
 * Helper pour vérifier si une route nécessite le rôle admin
 */
export function requiresAdmin(path: string): boolean {
  return ADMIN_ROUTES.some(route => path.startsWith(route));
}

/**
 * Obtenir le titre d'une page
 */
export function getPageTitle(path: string): string {
  return PAGE_TITLES[path as keyof typeof PAGE_TITLES] || 'Outlook AI Assistant';
}

/**
 * Navigation par défaut après login
 */
export const DEFAULT_ROUTE_AFTER_LOGIN = ROUTES.EMAIL.COMPOSE;

/**
 * Navigation par défaut après logout
 */
export const DEFAULT_ROUTE_AFTER_LOGOUT = ROUTES.AUTH.LOGIN;

/**
 * Route de redirection pour utilisateurs non authentifiés
 */
export const UNAUTHORIZED_REDIRECT = ROUTES.AUTH.LOGIN;

/**
 * Route de redirection pour utilisateurs sans permissions
 */
export const FORBIDDEN_REDIRECT = ROUTES.HOME;

/**
 * Navigation breadcrumb
 */
export interface BreadcrumbItem {
  label: string;
  path: string;
}

/**
 * Configuration des breadcrumbs par route
 */
export const BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  [ROUTES.EMAIL.COMPOSE]: [
    { label: 'Accueil', path: ROUTES.HOME },
    { label: 'Email', path: ROUTES.EMAIL.BASE },
    { label: 'Composer', path: ROUTES.EMAIL.COMPOSE }
  ],
  [ROUTES.EMAIL.TEMPLATES]: [
    { label: 'Accueil', path: ROUTES.HOME },
    { label: 'Email', path: ROUTES.EMAIL.BASE },
    { label: 'Templates', path: ROUTES.EMAIL.TEMPLATES }
  ],
  [ROUTES.USER.SETTINGS]: [
    { label: 'Accueil', path: ROUTES.HOME },
    { label: 'Utilisateur', path: ROUTES.USER.BASE },
    { label: 'Paramètres', path: ROUTES.USER.SETTINGS }
  ]
};

/**
 * Obtenir les breadcrumbs pour une route
 */
export function getBreadcrumbs(path: string): BreadcrumbItem[] {
  return BREADCRUMBS[path] || [{ label: 'Accueil', path: ROUTES.HOME }];
}
