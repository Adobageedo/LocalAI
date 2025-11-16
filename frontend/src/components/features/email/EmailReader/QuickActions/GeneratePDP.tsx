import React, { useState } from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { 
  PrimaryButton, 
  Spinner, 
  SpinnerSize, 
  MessageBar, 
  MessageBarType,
  Dropdown,
  IDropdownOption,
  Stack
} from '@fluentui/react';
import { theme } from '../../../../../styles';
import { useQuickAction } from '../../../../../contexts/QuickActionContext';
import { WINDFARMS } from '../../../../../config/constants';
import { 
  buildPDPExtractionPrompt, 
  buildEmailContext,
  callLLMWithStreaming,
  downloadPDPFile
} from '../../../../../utils/quickActions';

const GeneratePDP: React.FC = () => {
  const { currentEmail } = useOffice();
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [selectedWindfarm, setSelectedWindfarm] = useState<string>('unknown');
  const quickAction = useQuickAction();


  const handleGeneratePDP = async () => {
    if (!currentEmail) {
      setStatus({ type: 'error', message: 'Aucun email sélectionné' });
      return;
    }

    if (selectedWindfarm === 'unknown') {
      setStatus({ type: 'error', message: 'Veuillez sélectionner un parc éolien' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Extraction des données et génération du PDP en cours...' });
    
    // Start QuickAction with LLM and MCP
    quickAction.startAction('createPDP', true, true);

    try {
      // Get attachments if available
      const attachments = await getAttachments();

      // Build the email context using shared utility
      const emailContext = buildEmailContext(
        {
          subject: currentEmail.subject,
          from: currentEmail.from,
          body: currentEmail.body + (currentEmail.fullConversation ? `\n\nFULL CONVERSATION:\n${currentEmail.fullConversation}` : ''),
        },
        attachments.map((att: { name: string; size: number }) => ({ name: att.name, content: `Size: ${att.size} bytes` }))
      );

      // Get windfarm name from selection
      const windfarmName = WINDFARMS.find(wf => wf.key === selectedWindfarm)?.text || selectedWindfarm;

      // Update status to using MCP
      quickAction.updateStatus('using_mcp', 'Utilisation de l\'outil MCP generate_pdp_document...');
      quickAction.updateStatus('streaming', 'Génération du document en cours...');
      
      let fullResponse = '';
      
      // Use shared API helper for streaming
      await callLLMWithStreaming(
        {
          model: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 2000,
          useMcpTools: true,
          messages: [
            {
              role: 'system',
              content: buildPDPExtractionPrompt()
            },
            {
              role: 'user',
              content: `Extrait les informations de cet email pour le parc éolien "${windfarmName}" et génère un PDP en utilisant l'outil generate_pdp_document:\n\n${emailContext}`
            }
          ]
        },
        (chunk) => {
          if (!chunk.done && chunk.content) {
            fullResponse += chunk.content;
            quickAction.updateStreamedContent(fullResponse);
          }
        },
        (error) => {
          throw error;
        }
      );
      
      // Download the generated PDP file
      try {          
        await downloadPDPFile();
          
        quickAction.completeAction();
        setStatus({ 
          type: 'success', 
          message: `PDP généré pour ${windfarmName} et téléchargé avec succès!` 
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

  const dropdownOptions: IDropdownOption[] = WINDFARMS.map(wf => ({
    key: wf.key,
    text: wf.text,
    disabled: 'disabled' in wf ? wf.disabled : false,
  }));

  return (
    <Stack tokens={{ childrenGap: 12 }} styles={{ root: { width: 220 } }}>
      <Dropdown
        placeholder="Sélectionner un parc"
        label="Parc éolien"
        options={dropdownOptions}
        selectedKey={selectedWindfarm}
        onChange={(_, option) => option && setSelectedWindfarm(option.key as string)}
        disabled={isGenerating}
        styles={{
          dropdown: { width: '100%' },
          label: { fontWeight: 600, color: theme.colors.text },
        }}
      />
      
      <PrimaryButton
        text="Générer PDP"
        onClick={handleGeneratePDP}
        disabled={!currentEmail || isGenerating || selectedWindfarm === 'unknown'}
        styles={{
          root: {
            width: '100%',
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
          messageBarType={status.type === 'success' ? MessageBarType.success : status.type === 'error' ? MessageBarType.error : MessageBarType.info}
          onDismiss={() => setStatus(null)}
          styles={{ root: { width: '100%' } }}
        >
          {status.message}
        </MessageBar>
      )}
    </Stack>
  );
};

export default GeneratePDP;
