import React, { useState } from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton, Spinner, SpinnerSize, MessageBar, MessageBarType } from '@fluentui/react';
import { theme } from '../../../../../styles';
import { useQuickAction } from '../../../../../contexts/QuickActionContext';

const GeneratePDP: React.FC = () => {
  const { currentEmail } = useOffice();
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const quickAction = useQuickAction();

  const buildExtractionPrompt = () => {
    return `Tu es un assistant spécialisé dans l'extraction de données depuis des documents relatifs à des chantiers de parcs éoliens (Plan de Prévention).

INSTRUCTIONS IMPORTANTES :
- Les certifications sont souvent dans des PDF joints (noms de fichiers comme "GWO-WAH_Elie Amour.pdf", "H0B0_ELIE_2025.pdf")
- CHERCHE les informations "Filename indicates" qui contiennent des indices extraits des noms de fichiers
- Les dates d'expiration sont CRITIQUES - cherche des dates comme "Valid until", "Expiry", "Expire le", "Valable jusqu'au", ou des années (2025, 2026, 2027)
- Si tu vois "implied_expiry_date" dans les métadonnées de fichier, UTILISE cette date comme date d'expiration
- Si tu vois une année seule (ex: "2025"), utilise le 31 décembre de cette année (2025-12-31)
- Les noms de certifications incluent : GWO (Global Wind Organization), H0B0 (habilitation électrique), First Aid, Working at Heights (WAH), BST, etc.
- Si un PDF est marqué "[Scanned PDF - text extraction not possible]", utilise UNIQUEMENT les informations du filename
- CHERCHE si un document "Analyse de Risques" ou "Risk Analysis" est mentionné ou présent
- CHERCHE si un document "Mode Opératoire" ou "Operational Mode" est mentionné ou présent
- Retourne a la fin un bilan, en format texte et non en JSON, des informations extraites et un bilan des formations de chaque intervenant avec la date d'expiration (ne donne pas d'information pour une catgorie si elle est nulle)

Tu dois extraire les informations suivantes et les retourner sous forme de JSON valide :

1. **Entreprise** (company) qui réalisera les travaux:
   - name (nom de l'entreprise)
   - address (adresse complète)
   - phone (numéro de téléphone)
   - email (adresse email)
   - legal_representative (représentant légal)
   - hse_responsible (responsable HSE/sécurité)

2. **Intervenants** (workers) - tableau d'objets contenant qui vont intervenir sur site:
   - first_name (prénom)
   - last_name (nom)
   - phone (téléphone)
   - email (email)
   - certifications (tableau des habilitations) - CHERCHE LES DATES ATTENTIVEMENT :
     - certification_type (type : "GWO", "H0B0", "First Aid", "IRATA", etc.)
     - certification_name (nom complet : "GWO Working at Heights", "H0B0 Habilitation Électrique", etc.)
     - issue_date (date de délivrance au format YYYY-MM-DD ou null si non trouvée)
     - expiry_date (date d'expiration au format YYYY-MM-DD ou null si non trouvée)

IMPORTANT POUR LES DATES D'EXPIRATION :
- Cherche "Valid until", "Expiry", "Expire", "Valable jusqu'au", "Valid to", "Validity"
- Cherche des patterns comme "31/12/2025", "2025-12-31", "December 31, 2025"
- Si seulement une année est mentionnée (ex: "2025"), utilise "2025-12-31"
- **SI AUCUNE DATE D'EXPIRATION N'EST TROUVÉE, METS NULL** (certaines certifications n'ont pas de date d'expiration)
- Ne devine JAMAIS une date d'expiration - utilise uniquement ce qui est explicitement écrit

3. **Documents requis** (booléens indiquant si les documents sont présents) :
   - risk_analysis (true si "Analyse de Risques" ou "Risk Analysis" est mentionné, false sinon)
   - operational_mode (true si "Mode Opératoire" ou "Operational Mode" est mentionné, false sinon)

Format attendu :
{
  "company": { "name": "...", "address": "...", ... },
  "windfarmName": "...",
  "surname": "...",
  "mergeWithPDP": true,
  "workers": [
    {
      "first_name": "Elie",
      "last_name": "Amour",
      "phone": "06.44.34.06.88",
      "email": "ea@supairvision.com",
      "certifications": [
        { 
          "certification_type": "GWO",
          "certification_name": "GWO Working at Heights",
          "issue_date": "2023-05-15",
          "expiry_date": "2025-05-15"
        },
        { 
          "certification_type": "H0B0",
          "certification_name": "Habilitation Électrique H0B0",
          "issue_date": null,
          "expiry_date": "2025-12-31"
        }
      ]
    }
  ],
  "risk_analysis": false,
  "operational_mode": false
}

IMPORTANT: Return a resume of what you have extracted as information to the user.`;
  };

  const handleGeneratePDP = async () => {
    if (!currentEmail) {
      setStatus({ type: 'error', message: 'Aucun email sélectionné' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Extraction des données et génération du PDP en cours...' });
    
    // Start QuickAction with LLM and MCP
    quickAction.startAction('generatePDP', true, true);

    try {
      // Get attachments if available
      const attachments = await getAttachments();

      // Build the email context for the LLM
      const emailContext = `
EMAIL SUBJECT: ${currentEmail.subject}
FROM: ${currentEmail.from}

EMAIL BODY:
${currentEmail.body}

${currentEmail.fullConversation ? `\nFULL CONVERSATION:\n${currentEmail.fullConversation}` : ''}

${attachments.length > 0 ? `\nATTACHMENTS:\n${attachments.map(att => `- ${att.name} (${att.size} bytes)`).join('\n')}` : ''}
      `.trim();

      // Update status to using MCP
      quickAction.updateStatus('using_mcp', 'Utilisation de l\'outil MCP generate_pdp_document...');
      
      // Call the API with MCP tools enabled
      const response = await fetch('/api/promptLLM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 2000,
          useMcpTools: true,
          messages: [
            {
              role: 'system',
              content: buildExtractionPrompt()
            },
            {
              role: 'user',
              content: `Extrait les informations de cet email et génère un PDP en utilisant l'outil generate_pdp_document:\n\n${emailContext}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      // Update status to streaming
      quickAction.updateStatus('streaming', 'Génération du document en cours...');

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
      
      // Extract file path from response and trigger download
      try {          
        // Download the file
        await downloadPDPFile();
          
        quickAction.completeAction();
        setStatus({ 
          type: 'success', 
          message: 'PDP généré et téléchargé avec succès!' 
        });
      } catch (downloadError) {
        console.error('Error downloading file:', downloadError);
        quickAction.completeAction();
        setStatus({ 
          type: 'error', 
          message: 'Erreur lors du téléchargement du PDP' 
        });
      }
    } catch (error) {
      console.error('Error generating PDP:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      quickAction.setError(errorMsg);
      setStatus({ 
        type: 'error', 
        message: `Erreur lors de la génération: ${errorMsg}` 
      });
    } finally {
      setIsGenerating(false);
      // Reset after a delay
      setTimeout(() => quickAction.resetAction(), 3000);
    }
  };

  const downloadPDPFile = async () => {
    try {
      const response = await fetch('/api/download-pdp', { method: 'GET' });

      if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

      const blob = await response.blob();

      const disposition = response.headers.get('Content-Disposition');

      let filename = disposition?.match(/filename\*\=UTF-8''(.+)/)?.[1] 
        || disposition?.match(/filename="?(.+?)"?(\s|$|;)/)?.[1] 
        || 'PDP_document.pdf';

      filename = decodeURIComponent(filename);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('❌ Error downloading PDP file:', err);
    }
  };

  const getAttachments = async (): Promise<Array<{ name: string; size: number; contentType: string }>> => {
    if (typeof Office === 'undefined') {
      return [];
    }

    return new Promise((resolve) => {
      try {
        const item = Office.context.mailbox.item;
        
        if (item && item.attachments && item.attachments.length > 0) {
          const attachmentInfo = item.attachments.map(att => ({
            name: att.name,
            size: att.size || 0,
            contentType: att.contentType || 'unknown'
          }));
          
          console.log('Attachments found:', attachmentInfo);
          resolve(attachmentInfo);
        } else {
          console.log('No attachments found');
          resolve([]);
        }
      } catch (error) {
        console.error('Error getting attachments:', error);
        resolve([]);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
      <PrimaryButton
        text={isGenerating ? 'Génération en cours...' : 'Générer PDP'}
        onClick={handleGeneratePDP}
        disabled={isGenerating || !currentEmail}
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
      
      {isGenerating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <Spinner size={SpinnerSize.small} />
          <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
            Extraction et génération...
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

export default GeneratePDP;
