interface EmailContext {
  subject?: string;
  from?: string;
  additionalInfo?: string;
  tone?: string;
  body?: string;
  attachments?: { name: string; content?: string }[];
}

/**
 * Builds the complete system prompt to send to the LLM.
 * Adds email info and attachments if available.
 */
export const buildSystemPromptEN = (emailContext?: EmailContext) => {
  let systemContext = `You are an AI email assistant. 
Help the user write, correct, or summarize professional emails.
Always respond helpfully and provide realistic follow-up suggestions.`;

  if (emailContext) {
    systemContext += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Subject: ${emailContext.subject || 'No subject'}
• From: ${emailContext.from || 'Unknown sender'}
• Tone: ${emailContext.tone || 'Professional'}
${emailContext.additionalInfo ? `• User Instructions: ${emailContext.additionalInfo}` : ''}`;

    if (emailContext.body) {
      systemContext += `
\n📄 EMAIL BODY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${emailContext.body}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    if (emailContext.attachments && emailContext.attachments.length > 0) {
      systemContext += `

📎 ATTACHMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      emailContext.attachments.forEach((att, idx) => {
        systemContext += `
\n${idx + 1}. File: ${att.name}`;
        if (att.content) {
          systemContext += `
Content (excerpt):
${att.content.substring(0, 4000)} 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          systemContext += `\n(Content not available)`;
        }
      });
    }
  }

  // Add JSON output format and button rules
  systemContext += `
\n\n=== RESPONSE FORMAT (MANDATORY) ===

All responses must be valid JSON:

{
  "response": "only the email draft",
  "buttons": [
    {"label": "Short label", "action": "Likely next user message"},
    {"label": "Another label", "action": "Another likely next user message"}
  ]
}

⚠️ RULES:
- ALWAYS return valid JSON, no markdown or plain text.
- Include 3–5 context-relevant buttons.
- "action" = natural next user message, same language as the email.
- Focus only on content improvement, not external tasks.

Example:
{
  "response": "Here’s your email draft about the meeting...",
  "buttons": [
    {"label": "Add agenda", "action": "Can you include the meeting agenda?"},
    {"label": "Make it more formal", "action": "Please make this message more formal."}
  ]
}
`;

  return systemContext;
};

export const buildSystemPrompt = (emailContext?: EmailContext) => {
  let systemContext = `Vous êtes un assistant IA spécialisé dans les emails. 
Aidez l'utilisateur à rédiger, corriger ou résumer des emails professionnels.
Répondez toujours de manière utile et proposez des suggestions réalistes pour la suite.`;

  if (emailContext) {
    systemContext += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 CONTEXTE DE L'EMAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Objet : ${emailContext.subject || 'Pas d’objet'}
• De : ${emailContext.from || 'Expéditeur inconnu'}
• Ton : ${emailContext.tone || 'Professionnel'}
${emailContext.additionalInfo ? `• Instructions utilisateur : ${emailContext.additionalInfo}` : ''}`;

    if (emailContext.body) {
      systemContext += `
\n📄 CONTENU DE L'EMAIL :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${emailContext.body}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    if (emailContext.attachments && emailContext.attachments.length > 0) {
      systemContext += `

📎 PIÈCES JOINTES :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      emailContext.attachments.forEach((att, idx) => {
        systemContext += `
\n${idx + 1}. Fichier : ${att.name}`;
        if (att.content) {
          systemContext += `
Extrait du contenu :
${att.content.substring(0, 4000)} 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          systemContext += `\n(Contenu non disponible)`;
        }
      });
    }
  }

  // Ajouter le format de sortie JSON et les règles pour les boutons
  systemContext += `
\n\n=== FORMAT DE RÉPONSE (OBLIGATOIRE) ===

Toutes les réponses doivent être au format JSON valide :

{
  "response": "seulement le brouillon de l'email",
  "buttons": [
    {"label": "Petit libellé", "action": "Prochaine action probable de l'utilisateur"},
    {"label": "Un autre libellé", "action": "Une autre action probable de l'utilisateur"}
  ]
}

⚠️ RÈGLES :
- TOUJOURS retourner un JSON valide, sans markdown ni texte brut.
- Inclure 3 à 5 boutons pertinents par rapport au contexte.
- "action" = prochaine action naturelle de l'utilisateur, dans la même langue que l'email.
- Se concentrer uniquement sur l'amélioration du contenu, pas sur des tâches externes.
- La langue utilisée sera par défaut celle de l’utilisateur, sauf indication expresse de sa part pour une autre langue.

Exemple :
{
  "response": "Voici le brouillon de votre email concernant la réunion...",
  "buttons": [
    {"label": "Ajouter l'ordre du jour", "action": "Pouvez-vous inclure l'ordre du jour de la réunion ?"},
    {"label": "Rendre plus formel", "action": "Merci de rendre ce message plus formel."}
  ]
}
`;

  return systemContext;
};

export const buildUserPrompt = (emailContext: any, currentMessage: string, compose: boolean) => {
  let userContext = ""
  if (compose) {
    userContext = `Voici le mail que je suis en train de composer ainsi que la conversation :
      "${emailContext}"
        
      Voici ma demande :
      ${currentMessage.trim()}
        
      Tu repondras répondre en abordant directement ma demande, en tenant compte du contenu de l'email que je suis en train de composer. Si je demande une correction ou la création d'un nouvel email, retourne uniquement le corps de l'email.`

  }else{
    userContext = `J'ai reçu cet email :
      "${emailContext}"
        
      Voici ma demande :
      ${currentMessage.trim()}
        
      Tu repondras répondre en abordant directement ma demande, en tenant compte du contenu de l'email que j'ai reçu. Si je demande une synthesis ou la création d'un nouvel email, retourne uniquement le corps de l'email.`
  }
  return userContext
}  