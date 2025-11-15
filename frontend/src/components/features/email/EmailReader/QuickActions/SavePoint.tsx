import React, { useState } from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton, Spinner, SpinnerSize, MessageBar, MessageBarType } from '@fluentui/react';
import { theme } from '../../../../../styles';
import { useQuickAction } from '../../../../../contexts/QuickActionContext';

const SavePoint: React.FC = () => {
  const { currentEmail } = useOffice();
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const quickAction = useQuickAction();

  const buildExtractionPrompt = () => {
    return `Tu es un assistant spécialisé dans l'extraction d'informations depuis des emails pour créer des notes structurées.

INSTRUCTIONS IMPORTANTES :
- Extrait UNIQUEMENT les informations pertinentes de l'email
- La date doit être au format YYYY-MM-DD (utilise la date de l'email si non spécifiée dans le contenu)
- Le nom du parc éolien (windfarm) doit être extrait du sujet ou du corps de l'email
- Le topic doit être un résumé court et précis (max 100 caractères)
- Le comment doit contenir les détails importants de l'email
- Le type doit être l'une de ces catégories : "O&M", "operational", "invoice", "contract", "meeting", "incident", "maintenance", "other"
- Le company doit être le nom de l'entreprise mentionnée (si applicable)

TYPES DE NOTES :
- O&M : Opération et Maintenance
- operational : Opérationnel (mise en service, arrêts, production, etc.)
- invoice : Facturation (factures, paiements, devis)
- contract : Contractuel (contrats, avenants, négociations)
- meeting : Réunion (comptes-rendus, planification)
- incident : Incident (pannes, accidents, problèmes)
- maintenance : Maintenance préventive ou corrective
- other : Autre

EXEMPLES DE DÉTECTION :
- Email sur une facture → type: "invoice"
- Email sur un arrêt de machine → type: "operational"
- Email sur un compte-rendu de visite → type: "meeting"
- Email sur une panne → type: "incident"
- Email sur planification maintenance → type: "maintenance"

Tu dois retourner UNIQUEMENT un objet JSON valide avec cette structure :
{
  "date": "YYYY-MM-DD",
  "windfarm": "Nom du parc éolien",
  "topic": "Sujet court",
  "comment": "Détails complets extraits de l'email",
  "type": "O&M|operational|invoice|contract|meeting|incident|maintenance|other",
  "company": "Nom de l'entreprise (optionnel)"
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Si tu ne trouves pas le nom du parc éolien, utilise "Unknown" pour windfarm
- Si tu ne trouves pas la date, utilise la date du jour au format YYYY-MM-DD
- Le type DOIT être l'une des valeurs listées ci-dessus`;
  };

  const handleSavePoint = async () => {
    if (!currentEmail) {
      setStatus({ type: 'error', message: 'Aucun email sélectionné' });
      return;
    }

    setIsSaving(true);
    setStatus({ type: 'info', message: 'Extraction des informations et sauvegarde en cours...' });
    
    // Start QuickAction with LLM and MCP
    quickAction.startAction('savePoint', true, true);

    try {
      // Build the email context for the LLM
      const emailContext = `
EMAIL SUBJECT: ${currentEmail.subject}
FROM: ${currentEmail.from}
DATE: ${new Date().toISOString().split('T')[0]}

EMAIL BODY:
${currentEmail.body}

${currentEmail.fullConversation ? `\nFULL CONVERSATION:\n${currentEmail.fullConversation}` : ''}
      `.trim();

      // Update status to using MCP
      quickAction.updateStatus('using_mcp', 'Utilisation de l\'outil MCP save_note...');
      
      // Call the API with MCP tools enabled
      const response = await fetch('/api/promptLLM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 1000,
          useMcpTools: true,
          messages: [
            {
              role: 'system',
              content: buildExtractionPrompt()
            },
            {
              role: 'user',
              content: `Extrait les informations de cet email et sauvegarde la note en utilisant l'outil save_note:\n\n${emailContext}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      // Update status to streaming
      quickAction.updateStatus('streaming', 'Sauvegarde de la note...');

      // Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk' && data.delta) {
                  fullResponse += data.delta;
                  quickAction.updateStreamedContent(fullResponse);
                } else if (data.type === 'done') {
                  fullResponse = data.fullText || fullResponse;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Error parsing SSE:', parseError);
              }
            }
          }
        }
      }

      console.log('Save Point Response:', fullResponse);
      quickAction.completeAction();
      setStatus({ 
        type: 'success', 
        message: 'Point sauvegardé avec succès! Vérifiez notes_database.json' 
      });

    } catch (error) {
      console.error('Error saving point:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      quickAction.setError(errorMsg);
      setStatus({ 
        type: 'error', 
        message: `Erreur lors de la sauvegarde: ${errorMsg}` 
      });
    } finally {
      setIsSaving(false);
      // Reset after a delay
      setTimeout(() => quickAction.resetAction(), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
      <PrimaryButton
        text={isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder Point'}
        onClick={handleSavePoint}
        disabled={isSaving || !currentEmail}
        styles={{
          root: {
            width: 220,
            height: 50,
            fontWeight: 600,
            borderRadius: theme.effects.roundedCorner2,
            boxShadow: theme.effects.elevation8,
          },
        }}
      />
      
      {isSaving && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <Spinner size={SpinnerSize.small} />
          <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
            Extraction et sauvegarde...
          </span>
        </div>
      )}

      {status && (
        <MessageBar
          messageBarType={
            status.type === 'success' ? MessageBarType.success :
            status.type === 'error' ? MessageBarType.error :
            MessageBarType.info
          }
          onDismiss={() => setStatus(null)}
          dismissButtonAriaLabel="Fermer"
        >
          {status.message}
        </MessageBar>
      )}
    </div>
  );
};

export default SavePoint;
