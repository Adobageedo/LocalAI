/**
 * @typedef {Object} NextcloudFile
 * @property {string} id - Identifiant unique du fichier
 * @property {string} name - Nom du fichier
 * @property {string} path - Chemin complet du fichier
 * @property {string} mimeType - Type MIME du fichier
 * @property {number} size - Taille du fichier en octets
 * @property {string} etag - ETag du fichier
 * @property {string} lastModified - Date de dernière modification
 * @property {boolean} hasPreview - Indique si le fichier a une prévisualisation
 * @property {string} [previewUrl] - URL de prévisualisation si disponible
 * @property {string} [downloadUrl] - URL de téléchargement
 */

/**
 * @typedef {Object} NextcloudFolder
 * @property {string} id - Identifiant unique du dossier
 * @property {string} name - Nom du dossier
 * @property {string} path - Chemin complet du dossier
 * @property {number} size - Taille du dossier (somme des fichiers)
 * @property {string} lastModified - Date de dernière modification
 * @property {NextcloudFile[]} [files] - Fichiers dans ce dossier
 * @property {NextcloudFolder[]} [folders] - Sous-dossiers
 */

/**
 * @typedef {Object} NextcloudShare
 * @property {string} id - Identifiant unique du partage
 * @property {string} shareWith - Destinataire du partage (utilisateur, groupe)
 * @property {string} shareType - Type de partage (0=utilisateur, 1=groupe, 3=public)
 * @property {string} path - Chemin partagé
 * @property {string} token - Token de partage public
 * @property {string} [url] - URL de partage si public
 * @property {boolean} [isProtected] - Indique si le partage est protégé par mot de passe
 * @property {string} [expiration] - Date d'expiration du partage
 * @property {number} [permissions] - Permissions (lecture/écriture)
 */

/**
 * @typedef {Object} NextcloudConfig
 * @property {string} url - URL du serveur Nextcloud
 * @property {string} username - Nom d'utilisateur Nextcloud
 * @property {string} password - Mot de passe Nextcloud
 * @property {string} [webdavPath] - Chemin WebDAV (généralement /remote.php/webdav/)
 */

// Export vide pour permettre l'importation du fichier comme un module
export {};
