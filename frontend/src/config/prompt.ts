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
export const buildSystemPrompt = (emailContext?: EmailContext) => {
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
