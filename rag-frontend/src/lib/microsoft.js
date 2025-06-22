import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

/**
 * Service qui gère l'interaction avec l'API Microsoft
 */
const microsoftService = {
  /**
   * Vérifie si l'utilisateur est authentifié à Microsoft
   * @returns {Promise<Object>} Statut d'authentification
   */
  checkAuthStatus: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/sources/outlook/auth_status`);
      return await response.json();
    } catch (error) {
      console.error('Error checking Microsoft auth status:', error);
      return { isAuthenticated: false, error: error.message };
    }
  },

  /**
   * Obtient l'URL d'authentification pour Google Drive
   * @param {string} callbackUrl URL de redirection après authentification
   * @returns {Promise<Object>} URL d'authentification
   */
  getAuthUrl: async (callbackUrl) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/auth_url?callback=${encodeURIComponent(callbackUrl)}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting Google Drive auth URL:', error);
      return { error: error.message };
    }
  },

};

export default microsoftService;
