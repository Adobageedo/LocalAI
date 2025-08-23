import React, { useState } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  Dropdown,
  IDropdownOption
} from '@fluentui/react';
import { Edit24Regular } from '@fluentui/react-icons';
import { useTranslations } from '../utils/i18n';
import { useAuth } from '../contexts/AuthContext';

const MessageComposer: React.FC = () => {
  const { user } = useAuth();
  const t = useTranslations();
  const [isComposing, setIsComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [isLoading, setIsLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<{startTime: number, endTime?: number, duration?: number} | null>(null);
  const [statusMessage, setStatusMessage] = useState<{message: string, type: MessageBarType} | null>(null);

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional || 'Professional' },
    { key: 'friendly', text: t.toneFriendly || 'Friendly' },
    { key: 'formal', text: t.toneFormal || 'Formal' },
    { key: 'casual', text: t.toneCasual || 'Casual' },
    { key: 'urgent', text: t.toneUrgent || 'Urgent' },
    { key: 'apologetic', text: t.toneApologetic || 'Apologetic' },
  ];

  const handleStartComposing = () => {
    setIsComposing(true);
    // Clear any previous status messages
    setStatusMessage(null);
  };

  const handleComposeMessage = async () => {
    if (!subject || !messageContent) {
      setStatusMessage({
        message: 'Please fill in all required fields',
        type: MessageBarType.error
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    
    // Track performance metrics
    const startTime = performance.now();
    setPerformanceMetrics({ startTime });

    try {
      // This would connect to the actual API in production
      // For now, just simulate an API call with setTimeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Record performance metrics
      const endTime = performance.now();
      const duration = endTime - startTime;
      setPerformanceMetrics({ startTime, endTime, duration });
      
      console.log(`Message composed in ${duration.toFixed(2)}ms`);
      
      setStatusMessage({
        message: 'Message drafted successfully! (Development Mode)',
        type: MessageBarType.success
      });
      
      // In a real implementation, we would:
      // 1. Send the data to our backend API
      // 2. Process with LLM
      // 3. Return the composed message
      
    } catch (error) {
      console.error('Error composing message:', error);
      setStatusMessage({
        message: 'Failed to compose message. Please try again.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDevelopmentMessage = () => (
    <Stack horizontalAlign="center" tokens={{ childrenGap: 20 }} styles={{ root: { padding: '40px 20px' } }}>
      <Edit24Regular style={{ fontSize: '48px', color: '#0078d4' }} />
      <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
        Message Composer
      </Text>
      <Text variant="medium" styles={{ root: { textAlign: 'center', maxWidth: '400px', color: '#605e5c' } }}>
        This feature is currently in development. It will allow you to create new message drafts using AI assistance.
      </Text>
      <PrimaryButton text="Try Composer Preview" onClick={handleStartComposing} />
    </Stack>
  );

  const renderComposer = () => (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
        Compose New Message
      </Text>
      
      {statusMessage && (
        <MessageBar 
          messageBarType={statusMessage.type}
          onDismiss={() => setStatusMessage(null)}
          dismissButtonAriaLabel="Close"
        >
          {statusMessage.message}
        </MessageBar>
      )}
      
      <TextField
        label="Subject"
        value={subject}
        onChange={(_, newValue) => setSubject(newValue || '')}
        placeholder="Enter message subject"
        required
      />
      
      <Dropdown
        label={t.tone || 'Tone'}
        selectedKey={selectedTone}
        onChange={(_, option) => option && setSelectedTone(option.key as string)}
        placeholder="Select a tone"
        options={toneOptions}
        styles={{ dropdown: { width: '100%' } }}
      />
      
      <TextField
        label="Message Content"
        value={messageContent}
        onChange={(_, newValue) => setMessageContent(newValue || '')}
        placeholder="What would you like to say?"
        multiline
        rows={6}
        required
      />
      
      <PrimaryButton
        text="Compose with AI"
        onClick={handleComposeMessage}
        disabled={isLoading || !subject || !messageContent}
      />
      
      {isLoading && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }}>
          <Spinner size={SpinnerSize.small} />
          <Text>Composing message...</Text>
        </Stack>
      )}
      
      {performanceMetrics?.duration && (
        <Text variant="small" styles={{ root: { color: '#a19f9d' } }}>
          Message composed in {performanceMetrics.duration.toFixed(2)}ms
        </Text>
      )}
      
      <Text variant="small" styles={{ root: { color: '#d13438', fontStyle: 'italic', marginTop: '16px' } }}>
        Note: This feature is in development. Messages are not yet sent to the server.
      </Text>
    </Stack>
  );

  if (!user) return null;
  
  return (
    <Stack styles={{ root: { height: '100%' } }}>
      {!isComposing ? renderDevelopmentMessage() : renderComposer()}
    </Stack>
  );
};

export default MessageComposer;
