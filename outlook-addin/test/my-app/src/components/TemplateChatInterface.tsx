import React, { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  ScrollablePane,
  IStackTokens,
  getTheme,
  FontWeights,
  mergeStyles
} from '@fluentui/react';
import { Send20Regular, Bot20Regular, Person20Regular, Sparkle20Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from '../utils/i18n';
import { authFetch } from '../utils/authFetch';
import { API_ENDPOINTS } from '../config/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TemplateChatInterfaceProps {
  initialTemplate: string;
  conversationId?: string | null;
  onTemplateUpdate: (newTemplate: string) => void;
  isInline?: boolean;
  userRequest?: string;
  emailContext?: {
    subject?: string;
    from?: string;
    additionalInfo?: string;
    tone?: string;
  };
}

const TemplateChatInterface: React.FC<TemplateChatInterfaceProps> = ({
  initialTemplate,
  conversationId,
  onTemplateUpdate,
  isInline = false,
  userRequest,
  emailContext
}) => {
  const { user } = useAuth();
  const t = useTranslations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState(initialTemplate);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };
  
  const modernTextFieldStyles = {
    fieldGroup: {
      borderRadius: '12px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out',
      '@media (max-width: 768px)': {
        borderRadius: '8px'
      },
      '&:hover': {
        borderColor: theme.palette.themePrimary
      },
      '&:focus-within': {
        borderColor: theme.palette.themePrimary
      }
    },
    field: {
      fontSize: '14px',
      lineHeight: '1.5',
      padding: '12px',
      '@media (max-width: 768px)': {
        fontSize: '13px',
        padding: '10px'
      }
    }
  };
  
  const modernButtonStyles = {
    root: {
      borderRadius: '12px',
      height: '44px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '80px',
      transition: 'all 0.2s ease-in-out',
      '@media (max-width: 768px)': {
        height: '40px',
        fontSize: '13px',
        minWidth: '70px',
        borderRadius: '8px'
      }
    }
  };

  // Load conversation history or initialize with template
  useEffect(() => {
    const loadConversation = () => {
      if (conversationId) {
        // Try to load existing conversation from localStorage
        const savedConversation = localStorage.getItem(`chat_${conversationId}`);
        if (savedConversation) {
          try {
            const parsed = JSON.parse(savedConversation);
            const messagesWithDates = parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(messagesWithDates);
            return;
          } catch (e) {
            console.error('Failed to parse saved conversation:', e);
          }
        }
      }
      
      // Initialize with user request and template response
      const messages: ChatMessage[] = [];
      
      // Add user's original request as first message
      if (userRequest || emailContext) {
        let userContent = '';
        
        // if (emailContext?.subject || emailContext?.from) {
        //   userContent += 'Based on this email:\n';
        //   if (emailContext.subject) userContent += `Subject: ${emailContext.subject}\n`;
        //   if (emailContext.from) userContent += `From: ${emailContext.from}\n`;
        //   userContent += '\n';
        // }
        
        if (userRequest) {
          userContent += userRequest;
        }
        
        if (emailContext?.additionalInfo) {
          userContent += `\n\n${emailContext.additionalInfo}`;
        }
        
        const userMessage: ChatMessage = {
          id: '1',
          role: 'user',
          content: userContent,
          timestamp: new Date()
        };
        messages.push(userMessage);
      }
      
      // Add AI's template response
      const assistantMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: initialTemplate,
        timestamp: new Date()
      };
      messages.push(assistantMessage);
      
      setMessages(messages);
    };
    
    loadConversation();
  }, [initialTemplate, conversationId]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Save conversation to localStorage
    if (conversationId) {
      localStorage.setItem(`chat_${conversationId}`, JSON.stringify(updatedMessages));
    }
    setCurrentMessage('');
    setIsLoading(true);
    setError('');

    try {
      const requestData = {
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        user_request: currentMessage.trim(),
        conversation_id: conversationId
      };
      console.log(requestData);
      

      const response = await authFetch(`${API_ENDPOINTS.OUTLOOK_PROMPT}/refine`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.refined_template) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.refined_template,
          timestamp: new Date()
        };

        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        setCurrentTemplate(data.refined_template);
        onTemplateUpdate(data.refined_template);
        
        // Save conversation to localStorage
        if (conversationId) {
          localStorage.setItem(`chat_${conversationId}`, JSON.stringify(updatedMessages));
        }
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error: any) {
      console.error('Chat refinement error:', error);
      setError('Failed to refine template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const containerStyles = isInline 
    ? { 
        height: '800px', 
        width: '95%',
        margin: '20px auto 0 auto',
        border: `2px solid ${theme.palette.neutralLight}`, 
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        backgroundColor: theme.palette.white,
        overflow: 'hidden' as const,
        '@media (max-width: 768px)': {
          height: '800px',
          width: '98%',
          borderRadius: '12px',
          margin: '16px auto 0 auto'
        },
        '@media (max-width: 480px)': {
          height: '800px',
          width: '100%',
          margin: '12px 0 0 0',
          borderRadius: '8px'
        }
      }
    : { 
        height: '900px', 
        width: '95%',
        margin: '0 auto',
        border: `2px solid ${theme.palette.neutralLight}`, 
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        backgroundColor: theme.palette.white,
        overflow: 'hidden' as const,
        '@media (max-width: 768px)': {
          height: '900px',
          width: '98%',
          borderRadius: '12px'
        },
        '@media (max-width: 480px)': {
          height: '800px',
          width: '100%',
          margin: '0',
          borderRadius: '8px'
        }
      };

  return (
    <Stack tokens={stackTokens} styles={{ root: containerStyles }}>
      {/* Header */}
      <Stack 
        horizontal 
        horizontalAlign="start" 
        verticalAlign="center"
        styles={{ 
          root: { 
            padding: '16px 12px', 
            borderBottom: `2px solid ${theme.palette.neutralLighter}`,
            background: `linear-gradient(90deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
            position: 'relative',
            '@media (max-width: 768px)': {
              padding: '12px 8px'
            },
            '@media (max-width: 480px)': {
              padding: '10px 6px'
            }
          } 
        }}
      >
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
          <Sparkle20Regular style={{ fontSize: '20px', color: theme.palette.white }} />
          <Text 
            variant="mediumPlus" 
            styles={{ 
              root: { 
                fontWeight: FontWeights.bold,
                color: theme.palette.white
              } 
            }}
          >
            Affiner avec l'IA
          </Text>
        </Stack>
      </Stack>

      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error} 
          onDismiss={() => setError('')}
          styles={{ 
            root: { 
              margin: '16px 8px 0 8px',
              borderRadius: '8px',
              fontSize: '14px'
            } 
          }}
        >
          {error}
        </MessageBar>
      )}

      {/* Chat Messages */}
      <div
        ref={scrollableRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 8px',
          backgroundColor: '#fafbfc',
          '@media (max-width: 768px)': {
            padding: '16px 6px'
          },
          '@media (max-width: 480px)': {
            padding: '12px 4px'
          }
        } as React.CSSProperties}
      >
        <Stack tokens={{ childrenGap: 20 }}>
          {messages.map((message) => (
            <Stack
              key={message.id}
              horizontal={message.role === 'user'}
              horizontalAlign={message.role === 'user' ? 'end' : 'start'}
              tokens={{ childrenGap: 12 }}
            >
              {message.role === 'assistant' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: theme.palette.themePrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '4px',
                  flexShrink: 0
                }}>
                  <Bot20Regular style={{ fontSize: '16px', color: theme.palette.white }} />
                </div>
              )}
              
              <Stack
                styles={{
                  root: {
                    maxWidth: message.role === 'assistant' ? '100%' : '75%',
                    padding: '12px 16px',
                    borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: message.role === 'user' ? theme.palette.themePrimary : theme.palette.white,
                    color: message.role === 'user' ? theme.palette.white : theme.palette.neutralPrimary,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    border: message.role === 'assistant' ? `1px solid ${theme.palette.neutralLighter}` : 'none',
                    '@media (max-width: 768px)': {
                      maxWidth: message.role === 'assistant' ? '100%' : '85%',
                      padding: '10px 12px',
                      borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px'
                    },
                    '@media (max-width: 480px)': {
                      maxWidth: message.role === 'assistant' ? '100%' : '90%',
                      padding: '8px 10px'
                    }
                  }
                }}
              >
                <Text 
                  variant="small" 
                  styles={{ 
                    root: { 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5',
                      fontSize: '14px',
                      fontWeight: message.role === 'user' ? FontWeights.semibold : FontWeights.regular,
                      color: message.role === 'user' ? theme.palette.white : theme.palette.neutralPrimary
                    } 
                  }}
                >
                  {message.content}
                </Text>
                <Text 
                  variant="tiny" 
                  styles={{ 
                    root: { 
                      opacity: 0.7,
                      marginTop: '6px',
                      fontSize: '11px',
                      color: message.role === 'user' ? theme.palette.white : theme.palette.neutralSecondary
                    } 
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Stack>

              {message.role === 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: theme.palette.neutralSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '4px',
                  flexShrink: 0
                }}>
                  <Person20Regular style={{ fontSize: '16px', color: theme.palette.white }} />
                </div>
              )}
            </Stack>
          ))}

          {isLoading && (
            <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign="start">
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: theme.palette.themePrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                flexShrink: 0
              }}>
                <Bot20Regular style={{ fontSize: '16px', color: theme.palette.white }} />
              </div>
              <Stack
                styles={{
                  root: {
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    backgroundColor: theme.palette.white,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${theme.palette.neutralLighter}`
                  }
                }}
              >
                <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                  <Spinner 
                    size={SpinnerSize.small} 
                    styles={{ 
                      circle: { 
                        borderTopColor: theme.palette.themePrimary 
                      } 
                    }} 
                  />
                  <Text 
                    variant="small" 
                    styles={{
                      root: {
                        fontSize: '14px',
                        color: theme.palette.neutralSecondary
                      }
                    }}
                  >
                    Affinage en cours...
                  </Text>
                </Stack>
              </Stack>
            </Stack>
          )}
        </Stack>
      </div>

      {/* Input Area */}
      <Stack
        styles={{
          root: {
            padding: '20px 12px',
            borderTop: `2px solid ${theme.palette.neutralLighter}`,
            backgroundColor: theme.palette.white,
            '@media (max-width: 768px)': {
              padding: '16px 8px'
            },
            '@media (max-width: 480px)': {
              padding: '12px 6px'
            }
          }
        }}
      >
        <Stack 
          horizontal 
          tokens={{ childrenGap: 12 }} 
          verticalAlign="end"
          styles={{
            root: {
              '@media (max-width: 480px)': {
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '8px'
              }
            }
          }}
        >
          <TextField
            placeholder="Demandez-moi d'améliorer le template..."
            value={currentMessage}
            onChange={(_, newValue) => setCurrentMessage(newValue || '')}
            onKeyPress={handleKeyPress}
            multiline
            autoAdjustHeight
            disabled={isLoading}
            styles={{
              root: { flex: 1 },
              ...modernTextFieldStyles
            }}
          />
          <PrimaryButton
            text="Envoyer"
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            iconProps={{ iconName: 'Send' }}
            styles={modernButtonStyles}
          />
        </Stack>
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
