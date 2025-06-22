import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

/**
 * Library unifiant l'authentification, la gestion des tokens et l'ingestion 
 * pour les différents fournisseurs (Google, Microsoft)
 */
const authProviders = {
  /**
   * Vérifie le statut d'authentification d'un fournisseur
   * @param {string} provider - Le fournisseur ('gmail', 'outlook', 'gdrive')
   * @returns {Promise<Object>} Statut d'authentification
   */
  checkAuthStatus: async (provider) => {
    try {
      // Adapter le chemin d'API en fonction du fournisseur
      let endpoint;
      if (provider === 'google') {
        endpoint = 'db/gdrive/auth_status';
      } else {
        endpoint = `sources/outlook/auth_status`;
      }
      const response = await authFetch(`${API_BASE_URL}/${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Error checking ${provider} auth status: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error checking ${provider} auth status:`, error);
      return { authenticated: false, error: error.message };
    }
  },

  /**
   * Obtient l'URL d'authentification pour un fournisseur
   * @param {string} provider - Le fournisseur ('gmail', 'outlook', 'gdrive')
   * @returns {Promise<Object>} URL d'authentification
   */
  getAuthUrl: async (provider) => {
    try {
      // Adapter le chemin d'API en fonction du fournisseur
      let endpoint;
      
      if (provider === 'google') {
        const callbackUrl = API_BASE_URL + "/db/gdrive/oauth2_callback";
        endpoint = `db/gdrive/auth_url?callback_url=${encodeURIComponent(callbackUrl)}`;
      } else {
        const callbackUrl = API_BASE_URL + "/sources/outlook/callback";
        endpoint = `sources/outlook/auth?callback_url=${encodeURIComponent(callbackUrl)}`;
      }
      
      const response = await authFetch(`${API_BASE_URL}/${endpoint}`);
      if (!response.ok) {
        throw new Error(`Error getting ${provider} auth URL: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error getting ${provider} auth URL:`, error);
      return { error: error.message };
    }
  },
  
  /**
   * Ouvre une fenêtre popup pour l'authentification et gère le processus
   * @param {string} provider - Le fournisseur ('gmail', 'outlook', 'gdrive')
   * @returns {Promise<boolean>} Succès de l'authentification
   */
  authenticateWithPopup: async (provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Ouvrir la popup
        const popup = window.open("", `${provider}Auth`, "width=500,height=650");
        
        if (!popup) {
          throw new Error("Popup blocked! Please allow popups to continue authentication.");
        }
        
        // Récupérer l'URL d'auth
        const result = await authProviders.getAuthUrl(provider);
        
        if (!result || !result.auth_url) {
          popup.close();
          throw new Error(`Failed to get authentication URL for ${provider}`);
        }
        
        // Rediriger la popup vers l'URL d'auth
        popup.location.href = result.auth_url;
        
        // Configuration d'un timer pour vérifier l'authentification
        const checkAuthInterval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkAuthInterval);
            
            // Vérifier le statut d'authentification
            const authStatus = await authProviders.checkAuthStatus(provider);
            if (authStatus.authenticated) {
              resolve(true);
            } else {
              reject(new Error("Authentication window was closed before completion"));
            }
          }
        }, 1000);
        
        // Listener de message pour gérer le callback
        const messageListener = (event) => {
          if (event.data === `auth_success`) {
            window.removeEventListener("message", messageListener);
            clearInterval(checkAuthInterval);
            popup.close();
            resolve(true);
          }
        };
        
        window.addEventListener("message", messageListener);
        
        // Timeout de sécurité (2 minutes)
        setTimeout(() => {
          window.removeEventListener("message", messageListener);
          clearInterval(checkAuthInterval);
          if (!popup.closed) popup.close();
          reject(new Error("Authentication timed out"));
        }, 120000);
        
      } catch (error) {
        console.error(`Error authenticating with ${provider}:`, error);
        reject(error);
      }
    });
  },
  
  /**
   * Révoque l'accès à un fournisseur
   * @param {string} provider - Le fournisseur ('gmail', 'outlook', 'gdrive')  
   * @returns {Promise<Object>} Résultat de la révocation
   */
  revokeAccess: async (provider) => {
    try {
      // Adapter le chemin d'API en fonction du fournisseur
      let endpoint;
      if (provider === 'google') {
        endpoint = 'db/gdrive/revoke_access';
      } else {
        endpoint = `sources/outlook/revoke_access`;
      }
      const response = await authFetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error revoking ${provider} access: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error revoking ${provider} access:`, error);
      throw error;
    }
  },
  
  /**
   * Lance une ingestion de données via le gestionnaire de synchronisation
   * @param {string} provider - Le fournisseur ('gmail', 'outlook', 'gdrive', 'personal-storage')
   * @param {Object} options - Options d'ingestion
   * @param {boolean} options.forceReingest - Force la réingestion des documents
   * @returns {Promise<Object>} Résultat de l'opération
   */
  startIngestion: async (provider, options = {}) => {      
    const defaultOptions = {
      provider: provider,
      force_reingest: options.forceReingest || false
    };
    console.log(defaultOptions);
    try {
      const response = await authFetch(`${API_BASE_URL}/sources/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultOptions),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start ingestion for ${provider}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error starting ingestion for ${provider}:`, error);
      throw error;
    }
  },
  
  /**
   * Récupère les emails récents d'un fournisseur 
   * @param {string} provider - Le fournisseur ('gmail', 'outlook')
   * @param {number} limit - Nombre maximum d'emails à récupérer
   * @returns {Promise<Array>} Liste des emails
   */
  getRecentEmails: async (provider, limit = 10) => {
    try {
      let endpoint;
      if (provider === 'google') {
        endpoint = 'db/gdrive/recent_emails';
      } else {
        endpoint = `sources/outlook/recent_emails`;
      }
      const response = await authFetch(`${API_BASE_URL}/${endpoint}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching ${provider} emails: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${provider} emails:`, error);
      return [];
    }
  },
  
  /**
   * Vérifie si le fournisseur est Google Drive
   * @param {string} provider - Le fournisseur à vérifier
   * @returns {boolean} True si le fournisseur est Google Drive
   */
  isGoogleProvider: (provider) => {
    return ['gmail', 'gdrive'].includes(provider);
  },
  
  /**
   * Vérifie si le fournisseur est Microsoft
   * @param {string} provider - Le fournisseur à vérifier
   * @returns {boolean} True si le fournisseur est Microsoft
   */
  isMicrosoftProvider: (provider) => {
    return ['outlook'].includes(provider);
  },
  
  /**
   * Obtient le nom d'affichage d'un fournisseur
   * @param {string} provider - Le fournisseur
   * @returns {string} Nom d'affichage
   */
  getProviderDisplayName: (provider) => {
    const names = {
      'gmail': 'Gmail',
      'outlook': 'Microsoft Outlook',
      'gdrive': 'Google Drive',
      'personal-storage': 'Stockage Personnel'
    };
    
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  }
};

export default authProviders;
