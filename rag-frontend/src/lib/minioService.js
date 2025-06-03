import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

const minioService = {
  /**
   * Liste tous les fichiers et dossiers sous forme d'arborescence complète
   * @returns {Promise<Object>} - Structure d'arborescence complète des fichiers et dossiers
   */
  listAllFiles: async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/files/tree`);
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération de l'arborescence: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur listAllFiles:', error);
      throw error;
    }
  },

  /**
   * Liste les fichiers et dossiers dans un chemin donné
   * @param {string} path - Chemin à lister
   * @returns {Promise<Object>} - Liste des fichiers et dossiers
   */
  listFiles: async (path = '/') => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des fichiers: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur listFiles:', error);
      throw error;
    }
  },

  /**
   * Télécharge un fichier
   * @param {string} path - Chemin du fichier à télécharger
   * @returns {Promise<Blob>} - Blob du fichier
   */
  downloadFile: async (path) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/download?path=${encodeURIComponent(path)}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement: ${response.status}`);
      }
      
      const blob = await response.blob();
      // Création d'une URL pour le téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Extraction du nom de fichier depuis le chemin
      const fileName = path.split('/').pop();
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return blob;
    } catch (error) {
      console.error('Erreur downloadFile:', error);
      throw error;
    }
  },

  /**
   * Téléverse un fichier vers le bucket MinIO
   * @param {File} file - Fichier à téléverser
   * @param {string} path - Chemin de destination (avec nom du fichier)
   * @returns {Promise<Object>} - Confirmation du téléversement
   */
  uploadFile: async (file, path) => {
    try {
      // Extract directory path from the full path
      // The backend expects a directory path, not a full file path
      let dirPath = '';
      
      // Handle case where path might already be just a filename (root upload)
      if (path.includes('/')) {
        // Get the directory path by removing the filename
        const lastSlashIndex = path.lastIndexOf('/');
        dirPath = path.substring(0, lastSlashIndex + 1); // Keep the trailing slash
      }
      
      console.log('Uploading file:', file.name, 'to directory path:', dirPath);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', dirPath);
      
      const response = await authFetch(`${API_BASE_URL}/db/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du téléversement: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur uploadFile:', error);
      throw error;
    }
  },

  /**
   * Crée un dossier
   * @param {string} path - Chemin du dossier à créer
   * @returns {Promise<Object>} - Résultat de la création
   */
  createFolder: async (path) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/directory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la création du dossier: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur createFolder:', error);
      throw error;
    }
  },

  /**
   * Supprime un fichier ou dossier
   * @param {string} path - Chemin à supprimer
   * @param {boolean} recursive - Supprimer récursivement si c'est un dossier
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  deleteItem: async (path, recursive = false) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, recursive }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la suppression: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur deleteItem:', error);
      throw error;
    }
  },

  /**
   * Déplace ou renomme un fichier ou dossier
   * @param {string} sourcePath - Chemin source
   * @param {string} destinationPath - Chemin de destination
   * @returns {Promise<Object>} - Résultat du déplacement
   */
  moveItem: async (sourcePath, destinationPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_path: sourcePath,
          destination_path: destinationPath,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du déplacement: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur moveItem:', error);
      throw error;
    }
  },

  /**
   * Copie un fichier ou dossier
   * @param {string} sourcePath - Chemin source
   * @param {string} destinationPath - Chemin de destination
   * @returns {Promise<Object>} - Résultat de la copie
   */
  copyItem: async (sourcePath, destinationPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_path: sourcePath,
          destination_path: destinationPath,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la copie: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur copyItem:', error);
      throw error;
    }
  }
};

export default minioService;
