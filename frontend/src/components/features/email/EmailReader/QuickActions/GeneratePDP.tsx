import React, { useState } from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { 
  DefaultButton,
  IContextualMenuProps,
  Spinner, 
  SpinnerSize, 
  MessageBar, 
  MessageBarType,
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

interface WindfarmOption {
  key: string;
  text: string;
}

const GeneratePDP: React.FC = () => {
  const { currentEmail } = useOffice();
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [selectedWindfarm, setSelectedWindfarm] = useState<WindfarmOption | null>(null);
  const quickAction = useQuickAction();


  const handleGeneratePDP = async (windfarm: WindfarmOption) => {
    if (!currentEmail) {
      setStatus({ type: 'error', message: 'Aucun email sélectionné' });
      return;
    }

    setSelectedWindfarm(windfarm);

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
      const windfarmName = windfarm.text;

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

  // Create menu items from windfarms (excluding the disabled placeholder)
  const windfarmOptions = WINDFARMS.filter(wf => !('disabled' in wf && wf.disabled));
  
  const menuProps: IContextualMenuProps = {
    items: windfarmOptions.map(wf => ({
      key: wf.key,
      text: wf.text,
      onClick: () => {
        handleGeneratePDP({ key: wf.key, text: wf.text });
      },
    })),
  };

  return (
    <Stack tokens={{ childrenGap: 8 }} styles={{ root: { width: 220 } }}>
      <DefaultButton
        text={selectedWindfarm ? `PDP - ${selectedWindfarm.text}` : 'Générer PDP'}
        menuProps={menuProps}
        disabled={!currentEmail || isGenerating}
        styles={{
          root: {
            width: 220,
            height: 50,
            fontWeight: 600,
            borderRadius: theme.effects.roundedCorner2,
            boxShadow: theme.effects.elevation8,
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            border: 'none',
            ':hover': {
              backgroundColor: theme.colors.primaryDark,
              color: theme.colors.white,
            },
            ':active': {
              backgroundColor: theme.colors.primaryDark,
            },
          },
          menuIcon: {
            color: theme.colors.white,
          },
          label: {
            fontWeight: 600,
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
