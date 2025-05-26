/**
 * @typedef {Object} Document
 * @property {string} id - Identifiant unique du document
 * @property {string} name - Nom du document
 * @property {string} type - Type de document (pdf, docx, etc.)
 * @property {string} path - Chemin du document sur le serveur
 * @property {number} size - Taille du document en octets
 * @property {string} createdAt - Date de création du document
 * @property {string} updatedAt - Date de dernière modification du document
 * @property {string} [content] - Contenu du document (si disponible)
 * @property {string} [url] - URL du document (si disponible)
 */

/**
 * @typedef {Object} Folder
 * @property {string} id - Identifiant unique du dossier
 * @property {string} name - Nom du dossier
 * @property {string} path - Chemin du dossier sur le serveur
 * @property {string} [parentId] - ID du dossier parent (null pour la racine)
 * @property {Folder[]} [children] - Sous-dossiers
 * @property {Document[]} [documents] - Documents dans ce dossier
 * @property {string} createdAt - Date de création du dossier
 * @property {string} updatedAt - Date de dernière modification du dossier
 */

/**
 * @typedef {Object} UploadResult
 * @property {boolean} success - Indique si l'upload a réussi
 * @property {Document|null} document - Document créé si l'upload a réussi
 * @property {string} [error] - Message d'erreur si l'upload a échoué
 */

// Export vide pour permettre l'importation du fichier comme un module
export {};
