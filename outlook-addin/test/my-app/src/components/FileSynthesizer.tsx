import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  PrimaryButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  List,
  DocumentCard,
  DocumentCardTitle,
  DocumentCardDetails,
  DocumentCardActions,
  IButtonProps
} from '@fluentui/react';
import { DocumentText24Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { authFetch } from '../utils/authFetch';

// Use HTTPS for backend API
const API_BASE_URL = "https://localhost:8001/api";
const API_SYNTHESIZE_ENDPOINT = `${API_BASE_URL}/outlook/synthesize`;

interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  content?: string;
  summary?: string;
  isProcessing?: boolean;
}

const FileSynthesizer: React.FC = () => {
  const { user } = useAuth();
  const { isOfficeReady, currentEmail } = useOffice();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load attachments when component mounts
  useEffect(() => {
    if (isOfficeReady) {
      loadAttachments();
    }
  }, [isOfficeReady, currentEmail]);

  const loadAttachments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (typeof Office === 'undefined') {
        // Development mode - mock data
        setAttachments([
          { 
            id: 'mock-1', 
            name: 'Sample Document.docx', 
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 25600,
            isInline: false
          },
          { 
            id: 'mock-2', 
            name: 'Quarterly Report.pdf', 
            contentType: 'application/pdf',
            size: 512000,
            isInline: false
          }
        ]);
        setIsLoading(false);
        return;
      }

      const item = Office.context.mailbox.item;
      if (!item || typeof item.attachments === 'undefined') {
        setAttachments([]);
        setIsLoading(false);
        return;
      }

      const attachmentList: Attachment[] = [];
      
      // Get attachments from current email
      if (Array.isArray(item.attachments)) {
        for (const attachment of item.attachments) {
          if (!attachment.isInline) {
            attachmentList.push({
              id: attachment.id,
              name: attachment.name,
              contentType: attachment.contentType,
              size: attachment.size,
              isInline: attachment.isInline
            });
          }
        }
      }
      
      setAttachments(attachmentList);
    } catch (error) {
      console.error('Error loading attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSynthesizeFile = async (attachment: Attachment) => {
    // Update the attachment to show it's processing
    setAttachments(prev => 
      prev.map(att => 
        att.id === attachment.id 
          ? { ...att, isProcessing: true } 
          : att
      )
    );
    
    setError('');
    setSuccess('');

    try {
      if (typeof Office === 'undefined') {
        // Mock response in development mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockSummary = `This is a synthesized summary of "${attachment.name}".\n\n` +
          `The document contains important information about the project timeline, ` +
          `budget considerations, and next steps. Key points include:\n\n` +
          `1. Project deadline extended to Q3 2025\n` +
          `2. Budget increased by 15% to accommodate new requirements\n` +
          `3. Three new team members will join next month\n` +
          `4. Client feedback was generally positive with minor concerns about the UI`;
        
        setAttachments(prev => 
          prev.map(att => 
            att.id === attachment.id 
              ? { ...att, summary: mockSummary, isProcessing: false } 
              : att
          )
        );
        
        setSuccess(`Successfully synthesized "${attachment.name}"`);
        return;
      }

      // Get the attachment content
      Office.context.mailbox.item?.getAttachmentContentAsync(
        attachment.id,
        async (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const content = result.value.content;
            
            // Call the API to synthesize the file
            const requestData = {
              userId: user?.uid,
              fileName: attachment.name,
              fileType: attachment.contentType,
              content: content,
              base64Encoded: true
            };

            const response = await authFetch(API_SYNTHESIZE_ENDPOINT, {
              method: 'POST',
              body: JSON.stringify(requestData)
            });

            if (!response.ok) {
              throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.summary) {
              setAttachments(prev => 
                prev.map(att => 
                  att.id === attachment.id 
                    ? { ...att, summary: data.summary, isProcessing: false } 
                    : att
                )
              );
              setSuccess(`Successfully synthesized "${attachment.name}"`);
            } else {
              throw new Error('Invalid response from API');
            }
          } else {
            throw new Error(`Failed to get attachment content: ${result.error.message}`);
          }
        }
      );
    } catch (error: any) {
      console.error('File synthesis error:', error);
      setAttachments(prev => 
        prev.map(att => 
          att.id === attachment.id 
            ? { ...att, isProcessing: false } 
            : att
        )
      );
      setError(`Failed to synthesize "${attachment.name}": ${error.message}`);
    }
  };

  const renderAttachment = (attachment: Attachment) => {
    const actionProps: IButtonProps[] = [
      {
        iconProps: { iconName: 'DocumentSearch' },
        text: 'Synthesize',
        onClick: () => handleSynthesizeFile(attachment),
        disabled: attachment.isProcessing
      }
    ];

    return (
      <DocumentCard styles={{ root: { margin: '8px 0' } }}>
        <DocumentCardDetails>
          <DocumentCardTitle title={attachment.name} />
          <Text variant="small" styles={{ root: { color: '#666', marginLeft: '8px' } }}>
            {(attachment.size / 1024).toFixed(1)} KB
          </Text>
          
          {attachment.isProcessing && (
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { margin: '8px' } }}>
              <Spinner size={SpinnerSize.small} />
              <Text>Processing...</Text>
            </Stack>
          )}
          
          {attachment.summary && (
            <Stack styles={{ root: { margin: '8px', padding: '8px', backgroundColor: '#f8f8f8', borderRadius: '4px' } }}>
              <Text variant="small" styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                {attachment.summary}
              </Text>
            </Stack>
          )}
        </DocumentCardDetails>
        <DocumentCardActions actions={actionProps} />
      </DocumentCard>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <DocumentText24Regular style={{ fontSize: '18px', color: '#0078d4' }} />
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          Synthesize Attachments
        </Text>
      </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setSuccess('')}>
          {success}
        </MessageBar>
      )}

      {isLoading ? (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { padding: '20px' } }}>
          <Spinner size={SpinnerSize.small} />
          <Text>Loading attachments...</Text>
        </Stack>
      ) : attachments.length > 0 ? (
        <List
          items={attachments}
          onRenderCell={(item?: Attachment, index?: number) => {
            return item ? renderAttachment(item) : null;
          }}
        />
      ) : (
        <Stack horizontalAlign="center" styles={{ root: { padding: '20px', color: '#666' } }}>
          <Text>No attachments found in this email</Text>
        </Stack>
      )}
    </Stack>
  );
};

export default FileSynthesizer;
