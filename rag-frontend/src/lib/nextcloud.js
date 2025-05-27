import axios from 'axios';
import config from '../config';

// Création du client axios pour communiquer avec le backend API
const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
});

// Pas d'intercepteur d'authentification - mode sans auth

// Vérification que Nextcloud est accessible
const checkNextcloudStatus = async () => {
  try {
    console.log('[NEXTCLOUD API] Vérification de l\'accessibilité de Nextcloud');
    const response = await apiClient.get('/nextcloud/status');
    console.log('[NEXTCLOUD API] Nextcloud est accessible');
    return true;
  } catch (error) {
    console.error('[NEXTCLOUD API] Erreur lors de la vérification de Nextcloud:', error);
    return false;
  }
};
 
/**
 * Service Nextcloud pour gérer les fichiers via WebDAV
 */
class NextcloudService {
  /**
   * Récupère le contenu d'un répertoire
   * @param {string} path - Chemin du répertoire (par défaut racine)
   * @returns {Promise} - Promise avec la liste des fichiers et dossiers
   */
  async getDirectoryContents(path = '/') {
    try {
      console.log(`[NEXTCLOUD API] Listing du répertoire: ${path}`);
      
      // Appel à notre API backend qui fait le proxy vers Nextcloud
      const response = await apiClient.get(`/nextcloud/files?path=${encodeURIComponent(path)}`);
      console.log(`[NEXTCLOUD API] Récupéré les éléments du répertoire avec succès`);
      
      return response.data.files;
    } catch (error) {
      console.error('[NEXTCLOUD API] Erreur lors de la récupération du contenu du répertoire:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau dossier
   * @param {string} path - Chemin du nouveau dossier
   * @returns {Promise} - Promise résolue si la création est réussie
   */
  async createDirectory(path) {
    try {
      console.log(`[NEXTCLOUD API] Création du répertoire: ${path}`);
      
      // Appel à l'API backend pour créer un dossier
      const response = await apiClient.post('/nextcloud/directory', { path });
      console.log(`[NEXTCLOUD API] Répertoire créé avec succès: ${path}`);
      
      return true;
    } catch (error) {
      console.error('[NEXTCLOUD API] Erreur lors de la création du dossier:', error);
      throw error;
    }
  }

  /**
   * Télécharge un fichier
   * @param {string} path - Chemin du fichier à télécharger
   * @returns {Promise} - Promise avec le contenu du fichier
   */
  async getFileContents(path) {
    try {
      console.log(`[NEXTCLOUD API] Téléchargement du fichier: ${path}`);
      
      // Appel à notre API backend pour télécharger le fichier
      const response = await apiClient.get(`/nextcloud/download?path=${encodeURIComponent(path)}`, {
        responseType: 'arraybuffer'
      });
      console.log(`[NEXTCLOUD API] Fichier téléchargé avec succès: ${path}`);
      
      return response.data;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors du téléchargement du fichier ${path}:`, error);
      throw error;
    }
  }

  /**
   * Téléverse un fichier
   * @param {string} path - Chemin de destination
   * @param {File|Blob|string} content - Contenu du fichier
   * @returns {Promise} - Promise résolue si le téléversement est réussi
   */
  async uploadFile(path, content) {
    try {
      console.log(`[NEXTCLOUD API] Téléversement du fichier: ${path}`);
      
      // Préparer les données pour l'upload
      const formData = new FormData();
      
      // Si c'est un File ou Blob, on l'utilise directement
      if (content instanceof File || content instanceof Blob) {
        formData.append('file', content);
      } else {
        // Sinon, on crée un Blob à partir du contenu
        const blob = new Blob([content], { type: 'application/octet-stream' });
        formData.append('file', blob);
      }
      
      // Extraire le chemin du dossier parent
      const lastSlash = path.lastIndexOf('/');
      let parentPath = '/';
      let fileName = path;
      
      if (lastSlash > 0) {
        parentPath = path.substring(0, lastSlash + 1);
        fileName = path.substring(lastSlash + 1);
      }
      
      formData.append('path', parentPath);
      
      // Appel à notre API backend pour uploader le fichier
      await apiClient.post('/nextcloud/upload', formData);
      console.log(`[NEXTCLOUD API] Fichier téléversé avec succès: ${path}`);
      
      return true;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors du téléversement du fichier ${path}:`, error);
      throw error;
    }
  }

  /**
   * Supprime un fichier ou un dossier
   * @param {string} path - Chemin du fichier ou dossier à supprimer
   * @returns {Promise} - Promise résolue si la suppression est réussie
   */
  async deleteItem(path) {
    try {
      console.log(`[NEXTCLOUD API] Suppression de l'élément: ${path}`);
      
      // Appel à l'API backend pour supprimer un fichier/dossier
      await apiClient.delete(`//nextcloud/files?path=${encodeURIComponent(path)}`);
      console.log(`[NEXTCLOUD API] Élément ${path} supprimé avec succès`);
      
      return true;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la suppression de ${path}:`, error);
      throw error;
    }
  }

  /**
   * Renomme ou déplace un fichier ou dossier
   * @param {string} oldPath - Chemin actuel
   * @param {string} newPath - Nouveau chemin
   * @returns {Promise} - Promise résolue si le déplacement est réussi
   */
  async moveItem(oldPath, newPath) {
    try {
      console.log(`[NEXTCLOUD API] Déplacement de ${oldPath} vers ${newPath}`);
      
      // Appel à l'API backend pour déplacer un fichier/dossier
      await apiClient.post('/nextcloud/move', {
        sourcePath: oldPath,
        targetPath: newPath
      });
      console.log(`[NEXTCLOUD API] Élément déplacé avec succès de ${oldPath} vers ${newPath}`);
      
      return true;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors du déplacement de ${oldPath} vers ${newPath}:`, error);
      throw error;
    }
  }

  /**
   * Copie un fichier ou dossier
   * @param {string} sourcePath - Chemin source
   * @param {string} targetPath - Chemin cible
   * @returns {Promise} - Promise résolue si la copie est réussie
   */
  async copyItem(sourcePath, targetPath) {
    try {
      console.log(`[NEXTCLOUD API] Copie de ${sourcePath} vers ${targetPath}`);
      
      // Appel à l'API backend pour copier un fichier/dossier
      await apiClient.post('/nextcloud/copy', {
        sourcePath: sourcePath,
        targetPath: targetPath
      });
      console.log(`[NEXTCLOUD API] Élément copié avec succès de ${sourcePath} vers ${targetPath}`);
      
      return true;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la copie de ${sourcePath} vers ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si un fichier ou dossier existe
   * @param {string} path - Chemin à vérifier
   * @returns {Promise<boolean>} - Promise résolue avec true si l'élément existe
   */
  async exists(path) {
    try {
      console.log(`[NEXTCLOUD API] Vérification de l'existence de: ${path}`);
      
      // Comme notre API backend n'a pas d'endpoint spécifique pour vérifier l'existence,
      // nous essayons de récupérer les informations du fichier
      try {
        await this.getFileInfo(path);
        console.log(`[NEXTCLOUD API] L'élément ${path} existe`);
        return true;
      } catch (e) {
        console.log(`[NEXTCLOUD API] L'élément ${path} n'existe pas`);
        return false;
      }
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la vérification de l'existence de ${path}:`, error);
      return false;
    }
  }

  /**
   * Récupère les informations d'un fichier ou dossier
   * @param {string} path - Chemin de l'élément
   * @returns {Promise} - Promise résolue avec les informations
   */
  async getFileInfo(path) {
    try {
      console.log(`[NEXTCLOUD API] Récupération des informations pour: ${path}`);
      
      // Trouver le chemin du dossier parent
      const lastSlash = path.lastIndexOf('/');
      const parentPath = lastSlash > 0 ? path.substring(0, lastSlash) : '/';
      const fileName = lastSlash > 0 ? path.substring(lastSlash + 1) : path;
      
      // Récupérer le contenu du dossier parent
      const directoryContents = await this.getDirectoryContents(parentPath);
      
      // Chercher notre fichier/dossier
      const fileInfo = directoryContents.find(item => item.name === fileName);
      
      if (!fileInfo) {
        throw new Error(`Élément ${path} non trouvé`);
      }
      
      console.log(`[NEXTCLOUD API] Informations récupérées pour: ${path}`);
      return fileInfo;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la récupération des informations de ${path}:`, error);
      throw error;
    }
  }

  /**
   * Gère les droits de partage via l'API OCS
   * @param {string} path - Chemin de l'élément à partager
   * @param {number} permissions - Niveaux de permission (1: lecture, 2: écriture, etc.)
   * @param {string} shareWith - Utilisateur ou groupe avec qui partager
   * @param {number} shareType - Type de partage (0=utilisateur, 1=groupe, 3=public)
   * @returns {Promise} - Promise résolue avec les informations de partage
   */
  async createShare(path, permissions = 1, shareWith = null, shareType = 0) {
    try {
      console.log(`[NEXTCLOUD API] Création du partage pour: ${path}`);
      
      // Appel à l'API backend pour créer un partage
      const response = await apiClient.post('/nextcloud/shares', {
        path,
        permissions,
        shareWith,
        shareType
      });
      
      console.log(`[NEXTCLOUD API] Partage créé avec succès pour: ${path}`);
      return response.data;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la création du partage pour ${path}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les partages existants
   * @returns {Promise} - Promise résolue avec la liste des partages
   */
  async getShares() {
    try {
      console.log('[NEXTCLOUD API] Récupération des partages');
      
      // Appel à l'API backend pour récupérer les partages
      const response = await apiClient.get('/nextcloud/shares');
      
      console.log('[NEXTCLOUD API] Partages récupérés avec succès');
      return response.data.shares;
    } catch (error) {
      console.error('[NEXTCLOUD API] Erreur lors de la récupération des partages:', error);
      return [];
    }
  }

  /**
   * Supprime un partage
   * @param {string} shareId - ID du partage à supprimer
   * @returns {Promise} - Promise résolue si la suppression est réussie
   */
  async deleteShare(shareId) {
    try {
      console.log(`[NEXTCLOUD API] Suppression du partage: ${shareId}`);
      
      // Appel à l'API backend pour supprimer un partage
      await apiClient.delete(`/nextcloud/shares/${shareId}`);
      
      console.log(`[NEXTCLOUD API] Partage ${shareId} supprimé avec succès`);
      return true;
    } catch (error) {
      console.error(`[NEXTCLOUD API] Erreur lors de la suppression du partage ${shareId}:`, error);
      throw error;
    }
  }
}

// Export d'une instance du service
const nextcloudService = new NextcloudService();
export default nextcloudService;
