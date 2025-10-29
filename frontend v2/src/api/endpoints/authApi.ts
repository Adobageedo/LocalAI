/**
 * Auth API Endpoints
 * Endpoints pour l'authentification
 */

import { get, post, del } from '../client/apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { User, LoginCredentials, RegisterData } from '@/models/domain';

/**
 * Se connecter
 */
export async function login(credentials: LoginCredentials): Promise<{
  user: User;
  token: string;
  refreshToken?: string;
}> {
  return post(API_ENDPOINTS.AUTH.LOGIN, credentials);
}

/**
 * S'inscrire
 */
export async function register(data: RegisterData): Promise<{
  user: User;
  token: string;
}> {
  return post(API_ENDPOINTS.AUTH.REGISTER, data);
}

/**
 * Se déconnecter
 */
export async function logout(token: string): Promise<void> {
  return post(API_ENDPOINTS.AUTH.LOGOUT, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Rafraîchir le token
 */
export async function refreshToken(refreshToken: string): Promise<{
  token: string;
  refreshToken?: string;
}> {
  return post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
}

/**
 * Vérifier l'email
 */
export async function verifyEmail(token: string): Promise<void> {
  return post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
}

/**
 * Demander la réinitialisation du mot de passe
 */
export async function forgotPassword(email: string): Promise<void> {
  return post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
}

/**
 * Réinitialiser le mot de passe
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  return post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
}

/**
 * Obtenir le profil utilisateur
 */
export async function getProfile(token: string): Promise<User> {
  return get(API_ENDPOINTS.USERS.PROFILE, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Mettre à jour le profil
 */
export async function updateProfile(
  data: Partial<User>,
  token: string
): Promise<User> {
  return post(API_ENDPOINTS.USERS.UPDATE, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Supprimer le compte
 */
export async function deleteAccount(token: string): Promise<void> {
  return del(API_ENDPOINTS.USERS.BASE, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
