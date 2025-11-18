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
  Icon,
} from '@fluentui/react';
import { buildSystemPrompt, buildUserPrompt } from '../../../config/prompt';
import { QUICK_ACTIONS_DICTIONARY } from '../../../config/quickActions';
import { Toggle } from '@fluentui/react';
import { useQuickAction } from '../../../contexts/QuickActionContext';
import { llmService } from '../../../services/api';

interface SuggestedButton {
  label: string;
  action: string;  // The text/prompt to send when clicked
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedButtons?: SuggestedButton[];  // AI-suggested follow-up actions
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
  compose: boolean;
  quickActionKey?: string | null; // QuickAction key to initialize with user message
  emailContext?: {
    subject?: string;
    from?: string;
    additionalInfo?: string;
    tone?: string;
    body?: string;  // Current email body content
    attachments?: { name: string; content?: string; }[];  // Attachments with content
  };
  quickActions?: QuickAction[]; // List of quick action buttons
  activeActionKey?: string | null; // Currently active quick action for LLM context
}

const TemplateChatInterface: React.FC<TemplateChatInterfaceProps> = ({
  conversationId,
  onTemplateUpdate,
  compose,
  quickActionKey,
  emailContext,
  quickActions = [
    { actionKey: 'reply' },
    { actionKey: 'generate' },
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
  const [messagesLLM, setMessagesLLM] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [lastClickedButton, setLastClickedButton] = useState<string | null>(null);
  const [useRag, setUseRag] = useState(false);
  const [useFineTune, setUseFineTune] = useState(false);
  const quickActionContext = useQuickAction();

  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };

  /** Charger la conversation si elle existe */
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${conversationId}`);
    if (saved) {
      console.log('Chargement conversation:', saved);
      try {
        const parsed = JSON.parse(saved);
        const msgs = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(msgs);
        return;
      } catch (err) {
        console.error('Erreur chargement conversation:', err);
      }
    }
    
    // Initialize or reset conversation
    // If coming from QuickAction, always start fresh with personalized message
    if (quickActionKey) {
      const actionConfig = QUICK_ACTIONS_DICTIONARY[quickActionKey];
      if (actionConfig) {
        setMessages([{
          id: '1',
          role: 'user',
          content: actionConfig.userPrompt,
          timestamp: new Date(),
        }]);
        // Clear localStorage for this conversation
        // localStorage.removeItem(`chat_${conversationId}`);
        return;
      }
    }
    
    // Only initialize if we don't have messages yet (for non-QuickAction flows)
    setMessages(prev => {
      if (prev.length > 1) {
        return prev; // Keep existing conversation
      }
      
      // Default: assistant greeting
      return [{
        id: '1',
        role: 'assistant',
        content: "Bonjour, comment puis-je vous aider ?",
        timestamp: new Date(),
      }];
    });
  }, [conversationId, quickActionKey]);
  
  /** Update messages when QuickAction streams content */
  useEffect(() => {
    if (quickActionContext.state.isActive && quickActionContext.state.streamedContent) {
      setMessages(prev => {
        // Check if we already have a message for this QuickAction
        const hasQuickActionMessage = prev.some(m => m.id === 'quickaction-stream');
        
        if (hasQuickActionMessage) {
          // Update existing message
          return prev.map(m => 
            m.id === 'quickaction-stream'
              ? { ...m, content: quickActionContext.state.streamedContent }
              : m
          );
        } else {
          // Add new message
          return [
            ...prev,
            {
              id: 'quickaction-stream',
              role: 'assistant' as const,
              content: quickActionContext.state.streamedContent,
              timestamp: new Date(),
            }
          ];
        }
      });
    }
  }, [quickActionContext.state.streamedContent, quickActionContext.state.isActive]);

  /** Auto scroll vers le bas */
  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  /** Envoi du message utilisateur avec streaming */
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const isFirstMessage = messages.length === 1;

    // ✅ If it's the first message, append email context to user's message
    const llmContent = isFirstMessage 
      ? `${buildUserPrompt(emailContext, currentMessage, compose)}`
      : currentMessage.trim();
      
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
    setLastClickedButton(null); // Reset button state on new message

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
      const conversationMessagesLLM: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];

      // Build system message with context and active quick action
      conversationMessagesLLM.push({
        role: 'system',
        content: buildSystemPrompt()
      });

      // Add all conversation history (user and assistant messages)
      updated.forEach(msg => {
        if (msg.content === currentMessage.trim()) {
          conversationMessagesLLM.push({
            role: msg.role,
            content: llmContent
          });
        }else{
          conversationMessagesLLM.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    

      const lastUserMessage = [...conversationMessagesLLM].reverse().find(msg => msg.role === 'user');
      const prompt = lastUserMessage ? lastUserMessage.content : "Default fallback prompt";
      
      const modelToUse = useFineTune 
        ? "ft:gpt-4.1-nano-2025-04-14:personal::CZcTZYzO" // <-- replace with your fine-tuned model
        : "gpt-4.1-nano-2025-04-14"; // default base model

      // Use llmService for streaming
      let accumulatedText = '';

      for await (const chunk of llmService.streamPrompt({
        prompt,
        messages: conversationMessagesLLM,
        maxTokens: 800,
        temperature: 0.7,
        rag: useRag,
        model: modelToUse
      })) {
        if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Stream error');
        }
        
        if (chunk.type === 'chunk' && chunk.delta) {
          accumulatedText += chunk.delta;
                
                // Try to extract just the response text during streaming
                let displayText = accumulatedText;
                try {
                  // Check if we're accumulating JSON
                  if (accumulatedText.trim().startsWith('{')) {
                    // Try to extract content between "response": " and ", "buttons"
                    // Using [\s\S]* instead of . with 's' flag for ES5 compatibility
                    const responseMatch = accumulatedText.match(/"response"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
                    if (responseMatch && responseMatch[1]) {
                      // Decode escaped characters: \n, \", \\, etc.
                      displayText = responseMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\r/g, '\r')
                        .replace(/\\t/g, '\t')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                    } else {
                      // If we can't extract complete response yet, check if we're still building it
                      const partialMatch = accumulatedText.match(/"response"\s*:\s*"((?:[^"\\]|\\[\s\S])*)$/);
                      if (partialMatch && partialMatch[1]) {
                        // Show partial response being built
                        displayText = partialMatch[1]
                          .replace(/\\n/g, '\n')
                          .replace(/\\r/g, '\r')
                          .replace(/\\t/g, '\t')
                          .replace(/\\"/g, '"')
                          .replace(/\\\\/g, '\\');
                      }
                    }
                  }
                } catch (e) {
                  // If parsing fails, show raw text
                  console.warn('Failed to extract response during streaming:', e);
                }
                
          // Update assistant message in real-time
          setMessages(prev => 
            prev.map(m => 
              m.id === aiMessageId 
                ? { ...m, content: displayText }
                : m
            )
          );
        }
        
        if (chunk.type === 'done') {
          // Parse JSON response to extract buttons
          let finalContent = accumulatedText;
          let suggestedButtons: SuggestedButton[] | undefined = undefined;
          
          try {
            // Try to parse as JSON
            const jsonResponse = JSON.parse(accumulatedText);
            if (jsonResponse.response && jsonResponse.buttons) {
              finalContent = jsonResponse.response;
              suggestedButtons = jsonResponse.buttons;
            }
          } catch (e) {
            // If not JSON, use text as-is
            console.log('Response is not JSON, using as plain text');
          }
          
          // Finalize and save
          setMessages(prev => {
            const final = prev.map(m => 
              m.id === aiMessageId 
                ? { ...m, content: finalContent, suggestedButtons }
                : m
            );
            localStorage.setItem(`chat_${conversationId}`, JSON.stringify(final));
            return final;
          });
          onTemplateUpdate(finalContent);
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
        onClick: () => {
          // Email body will be included automatically by the system based on activeActionKey
          handleQuickAction(action.actionKey, 'Synthétiser le contenu de l\'email');
        },
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
            // Include file content if available with clear labeling for LLM
            const fileContext = att.content 
              ? `\n\n=== ATTACHMENT TO SUMMARIZE ===\nFile Name: ${att.name}\n\nFile Content:\n${att.content}` 
              : `\n\nNote: File "${att.name}" content could not be extracted. Please ask user if they can provide the key information from this file.`;
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

  const getStatusIcon = () => {
    switch (quickActionContext.state.status) {
      case 'extracting':
        return { iconName: 'SearchData', color: theme.palette.blue };
      case 'using_mcp':
        return { iconName: 'PlugConnected', color: theme.palette.purple };
      case 'streaming':
        return { iconName: 'Streaming', color: theme.palette.green };
      case 'complete':
        return { iconName: 'CheckMark', color: theme.palette.green };
      case 'error':
        return { iconName: 'ErrorBadge', color: theme.palette.red };
      default:
        return null;
    }
  };

  return (
    <Stack tokens={stackTokens} styles={{ root: { width: '100%', borderRadius: 12, height: '100%', display: 'flex', flexDirection: 'column' } }}>
      {/* Top Bar with Toggles */}
      <Stack
        horizontal
        horizontalAlign="space-between"
        verticalAlign="center"
        styles={{
          root: {
            padding: '12px 16px',
            backgroundColor: theme.palette.neutralLighter,
            borderBottom: `1px solid ${theme.palette.neutralLight}`,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          },
        }}
      >
        <Stack horizontal tokens={{ childrenGap: 16 }}>
          <Toggle
            label="Utiliser emails"
            checked={useRag}
            onChange={(_, checked) => setUseRag(!!checked)}
            styles={{ root: { marginBottom: 0 } }}
            inlineLabel
          />
          <Toggle
            label="Utiliser mon style"
            checked={useFineTune}
            onChange={(_, checked) => setUseFineTune(!!checked)}
            styles={{ root: { marginBottom: 0 } }}
            inlineLabel
          />
        </Stack>
      </Stack>

      {/* Status Indicator */}
      {quickActionContext.state.isActive && quickActionContext.state.status !== 'idle' && (
        <Stack
          horizontal
          verticalAlign="center"
          tokens={{ childrenGap: 8 }}
          styles={{
            root: {
              padding: '8px 16px',
              backgroundColor: theme.palette.themeLighter,
              borderBottom: `1px solid ${theme.palette.neutralLight}`,
            },
          }}
        >
          {getStatusIcon() && (
            <Icon iconName={getStatusIcon()!.iconName} styles={{ root: { color: getStatusIcon()!.color, fontSize: 16 } }} />
          )}
          <Text variant="small" styles={{ root: { color: theme.palette.neutralPrimary } }}>
            {quickActionContext.state.statusMessage}
          </Text>
          {quickActionContext.state.status !== 'complete' && quickActionContext.state.status !== 'error' && (
            <Spinner size={SpinnerSize.small} />
          )}
        </Stack>
      )}

      {/* Error Message */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {/* Zone messages */}
      <div ref={scrollableRef} style={{ flex: 1, overflowY: 'auto', padding: 16, backgroundColor: '#fafafa' }}>
        {messages.map((m, msgIndex) => {
          // Find the last assistant message index
          const lastAssistantIndex = messages.map((msg, idx) => msg.role === 'assistant' ? idx : -1).filter(idx => idx !== -1).pop();
          const isLastAssistant = m.role === 'assistant' && msgIndex === lastAssistantIndex;
          
          return (
          <div key={m.id} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div
              style={{
                display: 'inline-flex',          // change from inline-block to inline-flex
                alignItems: 'center',            // vertical centering
                justifyContent: 'center',        // horizontal centering
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
                <Text
                  variant="small"
                  style={{ color: m.role === 'user' ? 'white' : theme.palette.neutralPrimary, whiteSpace: 'pre-wrap' }}
                >
                  {m.content}
                  {isLoading && m.role === 'assistant' && m.content && ' ▌'}
                </Text>
              )}
            </div>
            
            {/* Suggested action buttons - only show for last assistant message */}
            {isLastAssistant && m.suggestedButtons && m.suggestedButtons.length > 0 && !isLoading && (
              <Stack 
                horizontal 
                wrap 
                tokens={{ childrenGap: 8 }} 
                styles={{ 
                  root: { 
                    marginTop: 8, 
                    marginLeft: m.role === 'assistant' ? 0 : 'auto',
                    maxWidth: '80%'
                  } 
                }}
              >
                {m.suggestedButtons.map((btn, idx) => {
                  const buttonKey = `${btn.label}-${btn.action}`;
                  return (
                    <DefaultButton
                      key={idx}
                      text={btn.label}
                      onClick={() => {
                        if (lastClickedButton === buttonKey) {
                          // Second click - send message
                          setCurrentMessage(btn.action);
                          setTimeout(() => {
                            handleSendMessage();
                            setLastClickedButton(null);
                          }, 50);
                        } else {
                          // First click - populate input
                          setCurrentMessage(btn.action);
                          setLastClickedButton(buttonKey);
                        }
                      }}
                      styles={{ 
                        root: { 
                          borderRadius: 8,
                          fontSize: 12,
                          padding: '4px 12px',
                          height: 'auto',
                          minHeight: 28,
                          backgroundColor: lastClickedButton === buttonKey ? theme.palette.themeLighter : undefined
                        } 
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </div>
        );
        })}

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

      <Stack
        horizontal
        tokens={{ childrenGap: 8 }}
        styles={{ root: { padding: 16, borderTop: `1px solid ${theme.palette.neutralLight}`, backgroundColor: theme.palette.white } }}
      >
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
          iconProps={{ iconName: 'Send' }}
          styles={{
            root: {
              minWidth: 100,
              height: 40,
            },
          }}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
