import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authProviders from '../lib/authProviders';

// localStorage key for persisting auth state
const AUTH_STATUS_STORAGE_KEY = 'rag_auth_status';

// Create the context with default values
const AuthContext = createContext({
  authStatusByProvider: {},
  isLoading: true,
  isAuthenticated: () => false,
  refreshAuthStatus: async () => ({ authenticated: false }),
  authenticateWithPopup: async () => false,
  revoke: async () => {},
});

/**
 * AuthProvider - Context provider component for authentication state
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array<string>} [props.providers=['gmail', 'gdrive', 'outlook']] - Providers to check
 * @returns {React.ReactElement} Provider component
 */
export const AuthProvider = ({ children, providers = ['gmail', 'gdrive', 'outlook'] }) => {
  // State to track authentication status for all providers
  const [authStatusByProvider, setAuthStatusByProvider] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Helper to save current auth status to localStorage
  const saveAuthStatusToLocalStorage = useCallback((statusMap) => {
    try {
      localStorage.setItem(AUTH_STATUS_STORAGE_KEY, JSON.stringify(statusMap));
    } catch (error) {
      console.error('Failed to save auth status to localStorage:', error);
    }
  }, []);

  // Check auth status for a single provider
  const refreshAuthStatus = useCallback(async (provider) => {
    try {
      const status = await authProviders.checkAuthStatus(provider);
      
      // Update state for this provider
      setAuthStatusByProvider((prev) => {
        const updated = {
          ...prev,
          [provider]: status,
        };
        
        // Save to localStorage
        saveAuthStatusToLocalStorage(updated);
        
        return updated;
      });
      
      return status;
    } catch (error) {
      const errorStatus = {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      // Update state with error
      setAuthStatusByProvider((prev) => {
        const updated = {
          ...prev,
          [provider]: errorStatus,
        };
        
        // Save to localStorage
        saveAuthStatusToLocalStorage(updated);
        
        return updated;
      });
      
      return errorStatus;
    }
  }, [saveAuthStatusToLocalStorage]);

  // Authenticate with popup for a provider
  const authenticateWithPopup = useCallback(async (provider) => {
    try {
      const result = await authProviders.authenticateWithPopup(provider);
      
      // After successful authentication, refresh the status
      await refreshAuthStatus(provider);
      
      return result;
    } catch (error) {
      console.error(`Authentication failed for ${provider}:`, error);
      
      // Update state with error
      setAuthStatusByProvider((prev) => {
        const updated = {
          ...prev,
          [provider]: {
            authenticated: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
          },
        };
        
        // Save to localStorage
        saveAuthStatusToLocalStorage(updated);
        
        return updated;
      });
      
      return false;
    }
  }, [refreshAuthStatus, saveAuthStatusToLocalStorage]);

  // Revoke access for a provider
  const revoke = useCallback(async (provider) => {
    try {
      await authProviders.revokeAccess(provider);
      
      // After revoking, refresh the status
      await refreshAuthStatus(provider);
    } catch (error) {
      console.error(`Revoke failed for ${provider}:`, error);
      
      // Update state with error
      setAuthStatusByProvider((prev) => {
        const updated = {
          ...prev,
          [provider]: {
            authenticated: false,
            error: error instanceof Error ? error.message : 'Revoke access failed',
          },
        };
        
        // Save to localStorage
        saveAuthStatusToLocalStorage(updated);
        
        return updated;
      });
    }
  }, [refreshAuthStatus, saveAuthStatusToLocalStorage]);

  // Convenience function to check if a provider is authenticated
  const isAuthenticated = useCallback((provider) => {
    return authStatusByProvider[provider]?.authenticated === true;
  }, [authStatusByProvider]);

  // Load auth status from localStorage on initial mount
  useEffect(() => {
    const loadAuthStatusFromLocalStorage = () => {
      try {
        const storedData = localStorage.getItem(AUTH_STATUS_STORAGE_KEY);
        if (storedData) {
          return JSON.parse(storedData);
        }
      } catch (error) {
        console.error('Failed to load auth status from localStorage:', error);
      }
      return {};
    };

    // Load initial state from localStorage
    const storedStatus = loadAuthStatusFromLocalStorage();
    setAuthStatusByProvider(storedStatus);

    // Check auth status for all providers on mount
    const checkAllProviders = async () => {
      setIsLoading(true);
      
      // Check each provider sequentially to avoid overwhelming the backend
      for (const provider of providers) {
        await refreshAuthStatus(provider);
      }
      
      setIsLoading(false);
    };

    checkAllProviders();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Only run on mount */]);

  // Prepare context value
  const contextValue = {
    authStatusByProvider,
    isLoading,
    isAuthenticated,
    refreshAuthStatus,
    authenticateWithPopup,
    revoke,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
