/**
 * @typedef {Object} User
 * @property {string} sub - Identifiant unique de l'utilisateur
 * @property {string} preferred_username - Nom d'utilisateur préféré
 * @property {string} [email] - Adresse e-mail de l'utilisateur
 * @property {boolean} [email_verified] - Indique si l'e-mail a été vérifié
 * @property {string} [name] - Nom complet de l'utilisateur
 * @property {string} [given_name] - Prénom de l'utilisateur
 * @property {string} [family_name] - Nom de famille de l'utilisateur
 * @property {Object} [realm_access] - Accès au realm
 * @property {string[]} [realm_access.roles] - Rôles de l'utilisateur dans le realm
 */

/**
 * @typedef {Object} TokenResponse
 * @property {string} access_token - Token d'accès JWT
 * @property {string} refresh_token - Token de rafraîchissement
 * @property {number} expires_in - Durée de validité du token en secondes
 * @property {number} refresh_expires_in - Durée de validité du token de rafraîchissement en secondes
 * @property {string} token_type - Type de token (généralement "Bearer")
 * @property {string} [id_token] - Token d'ID (pour OpenID Connect)
 * @property {string} [session_state] - État de la session
 * @property {string} scope - Portée du token
 */

/**
 * @typedef {Object} AuthContext
 * @property {User|null} user - Utilisateur connecté ou null si non connecté
 * @property {boolean} isAuthenticated - Indique si l'utilisateur est authentifié
 * @property {boolean} loading - Indique si l'authentification est en cours de chargement
 * @property {Error|null} error - Erreur d'authentification, le cas échéant
 * @property {Function} login - Fonction pour se connecter
 * @property {Function} register - Fonction pour s'inscrire
 * @property {Function} logout - Fonction pour se déconnecter
 * @property {Function} hasRole - Fonction pour vérifier si l'utilisateur a un rôle
 * @property {Function} getAccessToken - Fonction pour récupérer le token d'accès
 */

// Export vide pour permettre l'importation du fichier comme un module
export {};
