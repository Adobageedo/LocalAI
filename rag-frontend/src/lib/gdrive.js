import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

/**
 * Service qui gère l'interaction avec l'API Google Drive
 */
const gdriveService = {
  /**
   * Vérifie si l'utilisateur est authentifié à Google Drive
   * @returns {Promise<Object>} Statut d'authentification
   */
  checkAuthStatus: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/auth_status`);
      return await response.json();
    } catch (error) {
      console.error('Error checking Google Drive auth status:', error);
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

  /**
   * Liste les fichiers/dossiers à un chemin spécifique
   * @param {string} path Chemin dans Google Drive
   * @returns {Promise<Array>} Liste des fichiers/dossiers
   */
  listFiles: async (path) => {
    try {
      const encodedPath = encodeURIComponent(path || '/');
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/files?path=${encodedPath}`);
      const result = await response.json();
      return result.items || [];
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw error;
    }
  },

  /**
   * Crée un nouveau dossier dans Google Drive
   * @param {string} path Chemin où créer le dossier
   * @param {string} folderName Nom du nouveau dossier
   * @returns {Promise<Object>} Résultat de l'opération
   */
  createFolder: async (path, folderName) => {
    try {
      const fullPath = path === '/' ? `/${folderName}` : `${path}/${folderName}`;
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/mkdir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: fullPath }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating Google Drive folder:', error);
      throw error;
    }
  },

  /**
   * Télécharge un fichier depuis Google Drive
   * @param {string} path Chemin du fichier à télécharger
   * @returns {Promise<Blob>} Contenu du fichier
   */
  downloadFile: async (path) => {
    try {
      const encodedPath = encodeURIComponent(path);
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/download?path=${encodedPath}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Error downloading file: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error downloading Google Drive file:', error);
      throw error;
    }
  },

  /**
   * Supprime un fichier ou un dossier dans Google Drive
   * @param {string} path Chemin de l'élément à supprimer
   * @returns {Promise<Object>} Résultat de l'opération
   */
  deleteItem: async (path) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting Google Drive item:', error);
      throw error;
    }
  },

  /**
   * Téléverse un fichier vers Google Drive
   * @param {File} file Fichier à téléverser
   * @param {string} path Chemin de destination
   * @returns {Promise<Object>} Résultat de l'opération
   */
  uploadFile: async (file, path) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const response = await authFetch(`${API_BASE_URL}/db/gdrive/upload`, {
        method: 'POST',
        body: formData,
      });
      return await response.json();
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  },

  /**
   * Déplace un fichier ou dossier
   * @param {string} sourcePath Chemin source
   * @param {string} destinationPath Chemin de destination
   * @returns {Promise<Object>} Résultat de l'opération
   */
  moveItem: async (sourcePath, destinationPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          source_path: sourcePath, 
          destination_path: destinationPath 
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error moving Google Drive item:', error);
      throw error;
    }
  },

  /**
   * Copie un fichier ou dossier
   * @param {string} sourcePath Chemin source
   * @param {string} destinationPath Chemin de destination
   * @returns {Promise<Object>} Résultat de l'opération
   */
  copyItem: async (sourcePath, destinationPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/gdrive/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          source_path: sourcePath, 
          destination_path: destinationPath 
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error copying Google Drive item:', error);
      throw error;
    }
  },
};

export default gdriveService;
