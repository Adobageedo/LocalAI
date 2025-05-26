/**
 * @typedef {Object} EmailConfig
 * @property {string} host - Hôte du serveur de messagerie
 * @property {number} port - Port du serveur (993 pour IMAP sécurisé)
 * @property {string} user - Nom d'utilisateur
 * @property {string} password - Mot de passe
 * @property {boolean} tls - Utiliser TLS pour la connexion
 * @property {string} [mailbox] - Boîte aux lettres à ouvrir (par défaut INBOX)
 */

/**
 * @typedef {Object} EmailMessage
 * @property {string} id - Identifiant unique du message
 * @property {string} from - Expéditeur du message
 * @property {string[]} to - Destinataires du message
 * @property {string} subject - Objet du message
 * @property {string} date - Date d'envoi
 * @property {string} [text] - Contenu texte du message
 * @property {string} [html] - Contenu HTML du message
 * @property {EmailAttachment[]} [attachments] - Pièces jointes
 */

/**
 * @typedef {Object} EmailAttachment
 * @property {string} filename - Nom du fichier
 * @property {string} contentType - Type MIME
 * @property {number} size - Taille en octets
 * @property {string} contentId - Identifiant de contenu
 * @property {Buffer|string} content - Contenu de la pièce jointe
 */

/**
 * @typedef {Object} EmailFolder
 * @property {string} name - Nom du dossier
 * @property {number} total - Nombre total de messages
 * @property {number} unread - Nombre de messages non lus
 * @property {string} [path] - Chemin complet du dossier
 */

/**
 * @typedef {Object} EmailImportResult
 * @property {boolean} success - Indique si l'importation a réussi
 * @property {number} total - Nombre total de messages traités
 * @property {number} imported - Nombre de messages importés avec succès
 * @property {number} failed - Nombre de messages dont l'importation a échoué
 * @property {string[]} [errors] - Liste des erreurs rencontrées
 */

// Export vide pour permettre l'importation du fichier comme un module
export {};
