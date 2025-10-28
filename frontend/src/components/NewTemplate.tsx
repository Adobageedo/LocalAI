import React, { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  DefaultButton,
  IContextualMenuProps,
  IContextualMenuItem,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  IStackTokens,
  getTheme,
  FontWeights,
} from '@fluentui/react';
import { Bot20Regular, Person20Regular, Sparkle20Regular } from '@fluentui/react-icons';
import { authFetch } from '../utils/authFetch';
import { API_ENDPOINTS } from '../config/api';
import { QUICK_ACTIONS_DICTIONARY, QuickActionConfig } from '../config/quickActions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  actionKey: string;  // Key to lookup in dictionary
  email?: boolean;
  attachment?: {
    name: string;
    id: string;
    content?: string;  // File content if available
    contentType?: string;
  }[];
}

// Allowed file extensions for attachment processing
const ALLOWED_EXTENSIONS = [
  // Documents
  '.doc', '.docx', '.txt', '.rtf', '.odt',
  // Presentations
  '.ppt', '.pptx', '.odp',
  // Spreadsheets
  '.xls', '.xlsx', '.csv', '.ods', '.numbers',
  // PDFs
  '.pdf',
  // Text files
  '.md', '.json', '.xml'
];

// Filter attachments by allowed extensions
const filterAttachmentsByExtension = (attachments: QuickAction['attachment']): QuickAction['attachment'] => {
  if (!attachments) return [];
  return attachments.filter(att => {
    const extension = att.name.substring(att.name.lastIndexOf('.')).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension);
  });
};

interface TemplateChatInterfaceProps {
  conversationId: string;
  onTemplateUpdate: (newTemplate: string) => void;
  emailContext?: {
    subject?: string;
    from?: string;
    additionalInfo?: string;
    tone?: string;
  };
  quickActions?: QuickAction[]; // List of quick action buttons
  activeActionKey?: string | null; // Currently active quick action for LLM context
}

const TemplateChatInterface: React.FC<TemplateChatInterfaceProps> = ({
  conversationId,
  onTemplateUpdate,
  emailContext,
  quickActions = [
    { actionKey: 'reply' },
    { actionKey: 'correct' },
    { actionKey: 'reformulate' },
    {
      actionKey: 'summarize',
      email: true,
      attachment: [
        { name: 'Document1.pdf', id: 'att1' },
        { name: 'Document2.docx', id: 'att2' }
      ]
    }
  ]
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);


  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };

  /** Charger la conversation si elle existe */
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${conversationId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const msgs = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(msgs);
        return;
      } catch (err) {
        console.error('Erreur chargement conversation:', err);
      }
    }
    
    // Only initialize if we don't have messages yet
    setMessages(prev => {
      if (prev.length > 1) {
        return prev; // Keep existing conversation
      }
      
      // Initialize new conversation
      return [{
        id: '1',
        role: 'assistant',
        content: "Hello how can i help you",
        timestamp: new Date(),
      }];
    });
  }, [conversationId]);

  /** Auto scroll vers le bas */
  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  /** Envoi du message utilisateur avec streaming */
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setCurrentMessage('');
    setIsLoading(true);
    setError('');

    // Create placeholder for streaming assistant message
    const aiMessageId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    
    const withPlaceholder = [...updated, aiMsg];
    setMessages(withPlaceholder);

    try {
      // Build proper conversation messages array with system context
      const conversationMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
      
      // Build system message with context and active quick action
      let systemContext = 'You are an AI email assistant. Help the user with email-related tasks.';
      
      // Add quick action specific instructions
      if (activeActionKey) {
        const actionConfig = QUICK_ACTIONS_DICTIONARY[activeActionKey];
        if (actionConfig) {
          systemContext += `\n\n${actionConfig.llmPrompt}`;
        }
      }
      
      // Add email context if available
      if (emailContext) {
        systemContext += `\n\nEmail Context:\n- Subject: ${emailContext.subject || 'N/A'}\n- From: ${emailContext.from || 'N/A'}\n- Tone: ${emailContext.tone || 'professional'}`;
        if (emailContext.additionalInfo) {
          systemContext += `\n- Additional Info: ${emailContext.additionalInfo}`;
        }
      }
      
      systemContext += '\n\nProvide helpful, professional, and contextually appropriate responses.';
      
      conversationMessages.push({
        role: 'system',
        content: systemContext
      });
      
      // Add all conversation history (user and assistant messages)
      updated.forEach(msg => {
        conversationMessages.push({
          role: msg.role,
          content: msg.content
        });
      });

      const response = await fetch(API_ENDPOINTS.PROMPT_LLM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationMessages,
          maxTokens: 800,
          temperature: 0.7
        }),
      });

      if (!response.ok) throw new Error(`API failed: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.delta) {
                accumulatedText += data.delta;
                
                // Update assistant message in real-time
                setMessages(prev => 
                  prev.map(m => 
                    m.id === aiMessageId 
                      ? { ...m, content: accumulatedText }
                      : m
                  )
                );
              } else if (data.type === 'done') {
                // Finalize and save
                setMessages(prev => {
                  const final = prev.map(m => 
                    m.id === aiMessageId 
                      ? { ...m, content: accumulatedText }
                      : m
                  );
                  localStorage.setItem(`chat_${conversationId}`, JSON.stringify(final));
                  return final;
                });
                onTemplateUpdate(accumulatedText);
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Stream error');
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err: any) {
      setError('Erreur de communication avec le serveur.');
      console.error(err);
      // Remove placeholder message on error
      setMessages(updated);
    } finally {
      setIsLoading(false);
    }
  };
  // For a QuickAction that has attachments
  const buildMenuProps = (action: QuickAction): IContextualMenuProps | undefined => {
    if (!action.attachment && !action.email) return undefined;
  
    const items: IContextualMenuItem[] = [];
    const actionConfig = QUICK_ACTIONS_DICTIONARY[action.actionKey];
  
    // Add email item first if requested
    if (action.email) {
      items.push({
        key: 'email',
        text: 'Synthétiser Email',
        onClick: () =>
          handleQuickAction(action.actionKey, 'Synthétiser le contenu de l\'email', emailContext?.additionalInfo),
      });
    }
  
    // Filter and add only allowed attachments
    const filteredAttachments = filterAttachmentsByExtension(action.attachment);
    if (filteredAttachments && filteredAttachments.length > 0) {
      filteredAttachments.forEach((att) => {
        items.push({
          key: att.id,
          text: `Synthétiser ${att.name}`,
          onClick: () => {
            // Include file content if available
            const fileContext = att.content ? `\n\nFile Content (${att.name}):\n${att.content}` : '';
            handleQuickAction(
              action.actionKey, 
              `Synthétiser ${att.name}`,
              fileContext
            );
          },
        });
      });
    }
  
    return items.length > 0 ? { items } : undefined;
  };
  
  /** Handle quick action button click */
  const handleQuickAction = (actionKey: string, customPrompt?: string, additionalContext?: string) => {
    const actionConfig = QUICK_ACTIONS_DICTIONARY[actionKey];
    if (!actionConfig) return;
    
    const displayPrompt = customPrompt || actionConfig.userPrompt;
    
    if (lastQuickAction === actionKey) {
      // Clicked the same button twice → send message
      setActiveActionKey(actionKey);
      // If there's additional context (file content), append it
      if (additionalContext) {
        setCurrentMessage(prev => prev + additionalContext);
      }
      handleSendMessage();
      setLastQuickAction(null);
    } else {
      // First click → populate input and set active action
      let fullMessage = displayPrompt;
      if (additionalContext) {
        fullMessage += additionalContext;
      }
      setCurrentMessage(fullMessage);
      setLastQuickAction(actionKey);
      setActiveActionKey(actionKey);
    }
  };

  const isNewConversation = messages.length <= 2;

  return (
    <Stack tokens={stackTokens} styles={{ root: { width: '95%', margin: 'auto', borderRadius: 12 } }}>
      {/* Header */}
      <Stack horizontal verticalAlign="center" styles={{
        root: {
          padding: '12px',
          background: theme.palette.themePrimary,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
      }}>
        <Sparkle20Regular style={{ color: 'white' }} />
        <Text variant="mediumPlus" styles={{ root: { color: 'white', fontWeight: FontWeights.bold, marginLeft: 8 } }}>
          Assistant IA - Gestion Email
        </Text>
      </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {/* Zone messages */}
      <div ref={scrollableRef} style={{ height: 500, overflowY: 'auto', padding: 16, backgroundColor: '#fafafa' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div
              style={{
                display: 'inline-block',
                background: m.role === 'user' ? theme.palette.themePrimary : theme.palette.white,
                color: m.role === 'user' ? 'white' : theme.palette.neutralPrimary,
                padding: '10px 14px',
                borderRadius: 12,
                maxWidth: '80%',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* Show loading animation for empty assistant messages */}
              {!m.content && isLoading && m.role === 'assistant' ? (
                <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
                  <Spinner size={SpinnerSize.small} />
                  <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary } }}>
                    Génération en cours
                  </Text>
                </Stack>
              ) : (
                <Text variant="small" styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                  {m.content}
                  {isLoading && m.role === 'assistant' && m.content && ' ▌'}
                </Text>
              )}
            </div>
          </div>
        ))}

        {isLoading && !messages.some(m => m.role === 'assistant' && !m.content) && (
          <div style={{ textAlign: 'left', marginBottom: 12 }}>
            <Spinner size={SpinnerSize.small} label="Réflexion en cours..." />
          </div>
        )}
      </div>

      {/* Boutons actions rapides si nouvelle conversation */}
      {messages.every(m => m.role !== 'user') && quickActions.length > 0 && (
        <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
        {quickActions.map((action) => {
          const actionConfig = QUICK_ACTIONS_DICTIONARY[action.actionKey];
          if (!actionConfig) return null;
          
          const menuProps = buildMenuProps(action);
          return (
            <DefaultButton
              key={action.actionKey}
              text={actionConfig.label}
              iconProps={actionConfig.icon ? { iconName: actionConfig.icon } : undefined}
              onClick={() => !menuProps && handleQuickAction(action.actionKey)}
              menuProps={menuProps} // if attachments exist, shows dropdown
              styles={{ root: { borderRadius: 8 } }}
            />
          );
        })}
      </Stack>      
      )}

      {/* Zone de saisie */}
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { padding: 16, borderTop: '1px solid #ddd' } }}>
        <TextField
          placeholder="Écrivez un message..."
          value={currentMessage}
          onChange={(_, v) => setCurrentMessage(v || '')}
          multiline
          autoAdjustHeight
          styles={{ root: { flex: 1 } }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <PrimaryButton
          text="Envoyer"
          onClick={handleSendMessage}
          disabled={!currentMessage.trim() || isLoading}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
