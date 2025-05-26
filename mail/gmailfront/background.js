// Pour une gestion globale des requêtes API, mais actuellement non nécessaire
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateReply') {
      // Vous pouvez appeler l'API de génération de réponse ici si nécessaire.
    }
  });
  