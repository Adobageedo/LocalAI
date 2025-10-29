/**
 * Authentication Service
 * Service pour gérer l'authentification Firebase et l'état utilisateur
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { User, LoginCredentials, RegisterData } from '@/models/domain';
import { login as apiLogin, register as apiRegister, getProfile } from '@/api/endpoints/authApi';
import { TokenService } from './TokenService';

export class AuthService {
  private auth: Auth;
  private currentUser: User | null = null;

  constructor(auth: Auth) {
    this.auth = auth;
  }

  /**
   * Se connecter avec email/password
   */
  async login(credentials: LoginCredentials): Promise<{
    user: User;
    token: string;
  }> {
    try {
      // Authentification Firebase
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );

      // Obtenir le token Firebase
      const token = await userCredential.user.getIdToken();

      // Authentifier avec le backend
      const response = await apiLogin(credentials);

      // Sauvegarder le token
      TokenService.saveToken(token);
      if (response.refreshToken) {
        TokenService.saveRefreshToken(response.refreshToken);
      }

      // Mettre à jour l'utilisateur courant
      this.currentUser = response.user;

      return {
        user: response.user,
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * S'inscrire
   */
  async register(data: RegisterData): Promise<{
    user: User;
    token: string;
  }> {
    try {
      // Créer le compte Firebase
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        data.email,
        data.password
      );

      // Mettre à jour le profil Firebase
      if (data.displayName) {
        await updateProfile(userCredential.user, {
          displayName: data.displayName
        });
      }

      // Obtenir le token
      const token = await userCredential.user.getIdToken();

      // Créer l'utilisateur dans le backend
      const response = await apiRegister(data);

      // Sauvegarder le token
      TokenService.saveToken(token);

      this.currentUser = response.user;

      return {
        user: response.user,
        token
      };
    } catch (error) {
      console.error('Register error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Se déconnecter
   */
  async logout(): Promise<void> {
    try {
      const token = TokenService.getToken();
      
      // Déconnecter du backend
      if (token) {
        // Note: apiLogout nécessite le token
        // await apiLogout(token);
      }

      // Déconnecter de Firebase
      await signOut(this.auth);

      // Nettoyer les tokens
      TokenService.clearTokens();
      this.currentUser = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Obtenir l'utilisateur courant
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Obtenir l'utilisateur Firebase
   */
  getFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(): Promise<string> {
    try {
      const firebaseUser = this.auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No user logged in');
      }

      const token = await firebaseUser.getIdToken(true);
      TokenService.saveToken(token);

      return token;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser && !!TokenService.getToken();
  }

  /**
   * Charger le profil utilisateur depuis le backend
   */
  async loadUserProfile(): Promise<User> {
    try {
      const token = TokenService.getToken();
      if (!token) {
        throw new Error('No token available');
      }

      const user = await getProfile(token);
      this.currentUser = user;

      return user;
    } catch (error) {
      console.error('Load profile error:', error);
      throw error;
    }
  }

  /**
   * Écouter les changements d'authentification
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return this.auth.onAuthStateChanged(callback);
  }

  /**
   * Gérer les erreurs d'authentification
   */
  private handleAuthError(error: any): Error {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || 'Authentication error';

    // Mapper les codes d'erreur Firebase vers des messages conviviaux
    const errorMap: Record<string, string> = {
      'auth/user-not-found': 'Aucun compte trouvé avec cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/weak-password': 'Le mot de passe est trop faible',
      'auth/invalid-email': 'Email invalide',
      'auth/user-disabled': 'Ce compte a été désactivé',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
      'auth/network-request-failed': 'Erreur de connexion réseau'
    };

    const friendlyMessage = errorMap[errorCode] || errorMessage;

    return new Error(friendlyMessage);
  }
}

/**
 * Instance singleton du service (sera initialisée avec Firebase Auth)
 */
let authServiceInstance: AuthService | null = null;

/**
 * Initialiser le service d'authentification
 */
export function initializeAuthService(auth: Auth): void {
  authServiceInstance = new AuthService(auth);
}

/**
 * Obtenir l'instance du service
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    throw new Error('AuthService not initialized. Call initializeAuthService first.');
  }
  return authServiceInstance;
}
