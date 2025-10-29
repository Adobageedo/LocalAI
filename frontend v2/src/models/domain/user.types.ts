/**
 * User Domain Types
 * Types et interfaces pour le domaine utilisateur
 */

/**
 * Rôles utilisateur
 */
export type UserRole = 'free' | 'premium' | 'admin';

/**
 * Statut de l'utilisateur
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

/**
 * Interface principale User
 */
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Profil utilisateur étendu
 */
export interface UserProfile extends User {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
}

/**
 * Préférences utilisateur
 */
export interface UserPreferences {
  userId: string;
  
  // UI Preferences
  theme: 'light' | 'dark';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  
  // Email Preferences
  defaultTone: string;
  defaultLanguage: string;
  autoSaveDrafts: boolean;
  showSuggestions: boolean;
  
  // Notification Preferences
  emailNotifications: boolean;
  browserNotifications: boolean;
  notifyOnCompletion: boolean;
  
  // Privacy Preferences
  shareUsageData: boolean;
  allowTracking: boolean;
  
  // Feature Preferences
  enabledFeatures: string[];
  betaFeatures: string[];
  
  updatedAt: Date;
}

/**
 * Statistiques utilisateur
 */
export interface UserStats {
  userId: string;
  
  // Usage stats
  totalEmailsGenerated: number;
  totalEmailsCorrected: number;
  totalEmailsReformulated: number;
  totalEmailsSummarized: number;
  totalTemplatesCreated: number;
  totalTemplatesUsed: number;
  
  // Activity stats
  totalSessions: number;
  totalTimeSpentMinutes: number;
  lastActivityAt: Date;
  
  // Quota stats (pour free tier)
  monthlyGenerationsUsed: number;
  monthlyGenerationsLimit: number;
  dailyGenerationsUsed: number;
  dailyGenerationsLimit: number;
  
  // Streak
  currentStreak: number;
  longestStreak: number;
  
  updatedAt: Date;
}

/**
 * Abonnement utilisateur
 */
export interface UserSubscription {
  userId: string;
  plan: UserRole;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  
  // Dates
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  
  // Billing
  billingCycle?: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  
  // Limites
  features: string[];
  limits: {
    maxGenerationsPerDay: number;
    maxGenerationsPerMonth: number;
    maxTemplates: number;
    maxAttachmentSizeMB: number;
  };
  
  autoRenew: boolean;
  cancelledAt?: Date;
  updatedAt: Date;
}

/**
 * Token d'authentification
 */
export interface AuthToken {
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  type: 'Bearer';
}

/**
 * Session utilisateur
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    ip?: string;
  };
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

/**
 * Données de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Données d'inscription
 */
export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  acceptTerms: boolean;
}

/**
 * Données de réinitialisation de mot de passe
 */
export interface ResetPasswordData {
  email: string;
}

/**
 * Données de changement de mot de passe
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Activité utilisateur
 */
export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'email_generated' | 'template_created' | 'settings_updated';
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Notification utilisateur
 */
export interface UserNotification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Type guard pour vérifier si un utilisateur est admin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Type guard pour vérifier si un utilisateur est premium
 */
export function isPremium(user: User): boolean {
  return user.role === 'premium' || user.role === 'admin';
}

/**
 * Type guard pour vérifier si un utilisateur est actif
 */
export function isActiveUser(user: User): boolean {
  return user.status === 'active';
}

/**
 * Obtenir le nom complet de l'utilisateur
 */
export function getUserFullName(user: User | UserProfile): string {
  if ('firstName' in user && 'lastName' in user) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  return user.displayName || user.email.split('@')[0];
}

/**
 * Vérifier si l'utilisateur a atteint sa limite quotidienne
 */
export function hasReachedDailyLimit(stats: UserStats): boolean {
  return stats.dailyGenerationsUsed >= stats.dailyGenerationsLimit;
}

/**
 * Vérifier si l'utilisateur a atteint sa limite mensuelle
 */
export function hasReachedMonthlyLimit(stats: UserStats): boolean {
  return stats.monthlyGenerationsUsed >= stats.monthlyGenerationsLimit;
}
