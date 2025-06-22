import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

/**
 * Service qui gère l'interaction avec l'API Microsoft Outlook
 */
const outlookService = {
  /**
   * Vérifie si l'utilisateur est authentifié à Microsoft Outlook
   * @returns {Promise<Object>} Statut d'authentification
   */
  checkAuthStatus: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/outlook/auth_status`);
      return await response.json();
    } catch (error) {
      console.error('Error checking Microsoft Outlook auth status:', error);
      return { authenticated: false, error: error.message };
    }
  },

  /**
   * Obtient l'URL d'authentification pour Microsoft Outlook
   * @returns {Promise<Object>} URL d'authentification
   */
  getAuthUrl: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/outlook/auth`);
      return await response.json();
    } catch (error) {
      console.error('Error getting Microsoft Outlook auth URL:', error);
      return { error: error.message };
    }
  },
  
  /**
   * Révoque l'accès à Microsoft Outlook en supprimant les tokens stockés
   * @returns {Promise<Object>} Résultat de l'opération
   */
  revokeAccess: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/outlook/revoke_access`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Error revoking Microsoft Outlook access:', error);
      throw error;
    }
  },
  
  /**
   * Déconnexion de Microsoft Outlook
   * @returns {Promise<boolean>} Succès de la déconnexion
   */
  signOut: async () => {
    try {
      // Call the revoke access endpoint
      await outlookService.revokeAccess();
      return true;
    } catch (error) {
      console.error('Error signing out from Microsoft Outlook:', error);
      throw error;
    }
  }
};

export default outlookService;
