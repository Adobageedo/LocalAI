console.log("[AI Reply] Script chargé");

function insertAIReplyButton(replyButton) {

  const alreadyInserted = replyButton.parentElement.querySelector('.ai-reply-button');
  if (alreadyInserted) {
    return;
  }

  // Créer le bouton AI Reply
  const aiReplyButton = document.createElement('button');
  aiReplyButton.innerText = 'AI Reply';
  aiReplyButton.className = 'ai-reply-button';
  aiReplyButton.style.marginLeft = '10px';
  aiReplyButton.style.padding = '6px 12px';
  aiReplyButton.style.backgroundColor = '#1a73e8';
  aiReplyButton.style.color = 'white';
  aiReplyButton.style.border = 'none';
  aiReplyButton.style.borderRadius = '4px';
  aiReplyButton.style.cursor = 'pointer';
  aiReplyButton.style.fontSize = '13px';

  // Ajouter l'événement au clic
  aiReplyButton.addEventListener('click', async () => {
    console.log("[AI Reply] Bouton cliqué");

    // Extract email subject, recipient, conversation, and user email
    const emailBody = document.querySelector('.ii.gt')?.innerText || '';
    const emailSubject = document.querySelector('h2.hP')?.innerText || '';
    const recipient = document.querySelector('span.gD')?.getAttribute('email') || '';
    const user_id = document.querySelector('a.gb_D.gb_Oa.gb_i')?.getAttribute('aria-label')?.match(/\b[\w.-]+@[\w.-]+\.\w+\b/)?.[0] || '';

    const prompt = `Rédige une réponse polie et professionnelle à ce fil de discussion.`;
    const conversation = emailBody;

    try {
      const response = await fetch('http://localhost:5001/generate-email-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          recipient: recipient,
          prompt: prompt,
          conversation: conversation,
          user_id: user_id
        })
      });

      if (!response.ok) {
        throw new Error(`[AI Reply] API Error: ${response.status}`);
      }

      const data = await response.json();
      const draft = data.draft;

      if (draft) {
        document.querySelector('div[aria-label="Répondre"]').click();
        setTimeout(() => {
          const replyBox = document.querySelector('.Am.Al.editable.LW-avf');
          if (replyBox) {
            replyBox.innerHTML = draft;
            console.log("[AI Reply] Réponse insérée !");
          } else {
            console.warn("[AI Reply] Zone de réponse non trouvée !");
          }
        }, 1000);
      }
    } catch (error) {
      console.error("[AI Reply] Erreur lors de l’appel à l’API :", error);
    }
  });

  // Insérer le bouton dans le DOM
  replyButton.parentElement.appendChild(aiReplyButton);
  console.log("[AI Reply] Bouton 'AI Reply' inséré avec succès !");
}

function observeReplyButtons() {
  const observer = new MutationObserver(() => {
    const replyButtons = document.querySelectorAll('div[aria-label="Répondre"]');
    if (replyButtons.length === 0) {
      console.log("[AI Reply] Aucun bouton 'Répondre' détecté pour l'instant");
    }

    replyButtons.forEach(replyButton => {
      insertAIReplyButton(replyButton);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[AI Reply] Observation démarrée sur le DOM");
}

// Démarrer après que Gmail soit prêt
window.addEventListener('load', () => {
  console.log("[AI Reply] Page Gmail chargée, démarrage de l’observateur");
  observeReplyButtons();
});
