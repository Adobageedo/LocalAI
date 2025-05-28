/**
 * @typedef {Object} Prompt
 * @property {string} id - Identifiant unique du prompt
 * @property {string} text - Texte du prompt
 * @property {string} [context] - Contexte du prompt (documents utilisés, etc.)
 * @property {string} createdAt - Date de création du prompt
 * @property {string} [userId] - ID de l'utilisateur qui a créé le prompt
 */

/**
 * @typedef {Object} AIResponse
 * @property {string} id - Identifiant unique de la réponse
 * @property {string} promptId - ID du prompt correspondant
 * @property {string} text - Texte de la réponse
 * @property {string[]} [sources] - Sources utilisées pour la réponse
 * @property {number} [confidence] - Niveau de confiance (0-1)
 * @property {string} createdAt - Date de création de la réponse
 * @property {string} model - Modèle utilisé pour générer la réponse
 */

/**
 * @typedef {Object} AIModel
 * @property {string} id - Identifiant unique du modèle
 * @property {string} name - Nom du modèle
 * @property {string} provider - Fournisseur du modèle (OpenAI, local, etc.)
 * @property {number} [maxTokens] - Nombre maximum de tokens par requête
 * @property {string[]} [capabilities] - Capacités du modèle (texte, code, etc.)
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - Identifiant unique de la conversation
 * @property {string} title - Titre de la conversation
 * @property {string} createdAt - Date de création de la conversation
 * @property {string} updatedAt - Date de dernière mise à jour
 * @property {Message[]} messages - Messages de la conversation
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Identifiant unique du message
 * @property {string} role - Rôle (user, assistant, system)
 * @property {string} content - Contenu du message
 * @property {string} createdAt - Date de création du message
 */

// Export vide pour permettre l'importation du fichier comme un module
export {};
