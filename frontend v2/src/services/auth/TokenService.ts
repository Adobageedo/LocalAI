/**
 * Token Service
 * Service pour gérer les tokens d'authentification
 */

import { STORAGE_KEYS } from '@/config/storage';

export class TokenService {
  /**
   * Sauvegarder le token d'authentification
   */
  static saveToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Obtenir le token d'authentification
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Sauvegarder le refresh token
   */
  static saveRefreshToken(refreshToken: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  /**
   * Obtenir le refresh token
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Supprimer tous les tokens
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Vérifier si un token est valide (non expiré)
   */
  static isTokenValid(token: string): boolean {
    try {
      // Décoder le JWT
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return false;
      }

      // Vérifier l'expiration (avec une marge de 5 minutes)
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes

      return expirationTime > currentTime + bufferTime;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * Décoder un JWT token
   */
  static decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Obtenir les informations de l'utilisateur depuis le token
   */
  static getUserInfoFromToken(token: string): {
    userId?: string;
    email?: string;
    exp?: number;
  } | null {
    try {
      const payload = this.decodeToken(token);
      return {
        userId: payload?.user_id || payload?.sub,
        email: payload?.email,
        exp: payload?.exp
      };
    } catch (error) {
      console.error('Error getting user info from token:', error);
      return null;
    }
  }

  /**
   * Vérifier si le token doit être rafraîchi
   */
  static shouldRefreshToken(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      // Rafraîchir si expiration dans moins de 10 minutes
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const refreshThreshold = 10 * 60 * 1000; // 10 minutes

      return expirationTime < currentTime + refreshThreshold;
    } catch (error) {
      return true;
    }
  }
}
