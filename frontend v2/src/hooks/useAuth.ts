/**
 * useAuth Hook
 * Hook pour gérer l'authentification
 */

import { useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterData } from '@/models/domain';
import { getAuthService } from '@/services/auth/AuthService';

interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger l'utilisateur au montage
   */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const authService = getAuthService();
        
        // Vérifier si authentifié
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          
          // Si pas de user en mémoire, charger depuis le backend
          if (!currentUser) {
            const loadedUser = await authService.loadUserProfile();
            setUser(loadedUser);
          } else {
            setUser(currentUser);
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * Écouter les changements d'authentification
   */
  useEffect(() => {
    const authService = getAuthService();
    
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Charger le profil utilisateur
          const loadedUser = await authService.loadUserProfile();
          setUser(loadedUser);
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Se connecter
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = getAuthService();
      const result = await authService.login(credentials);
      setUser(result.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * S'inscrire
   */
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = getAuthService();
      const result = await authService.register(data);
      setUser(result.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Se déconnecter
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = getAuthService();
      await authService.logout();
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Réinitialiser le mot de passe
   */
  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = getAuthService();
      await authService.resetPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reset password failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Rafraîchir le token
   */
  const refreshToken = useCallback(async () => {
    try {
      const authService = getAuthService();
      await authService.refreshToken();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refresh token failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    resetPassword,
    refreshToken
  };
}
