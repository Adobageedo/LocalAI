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
  IStackTokens
} from '@fluentui/react';
import { Send20Regular, Bot20Regular, Person20Regular } from '@fluentui/react-icons';
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

  const stackTokens: IStackTokens = { childrenGap: 12 };

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
        height: '400px', 
        border: '1px solid #e1e1e1', 
        borderRadius: '4px',
        marginTop: '16px'
      }
    : { 
        height: '500px', 
        border: '1px solid #e1e1e1', 
        borderRadius: '4px' 
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
            padding: '12px 16px', 
            borderBottom: '1px solid #e1e1e1',
            backgroundColor: '#f8f9fa'
          } 
        }}
      >
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          <Bot20Regular style={{ fontSize: '18px', color: '#0078d4' }} />
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Refine Template with AI
          </Text>
        </Stack>
      </Stack>

      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error} 
          onDismiss={() => setError('')}
          styles={{ root: { margin: '0 16px' } }}
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
          padding: '16px',
          backgroundColor: '#ffffff'
        }}
      >
        <Stack tokens={{ childrenGap: 16 }}>
          {messages.map((message) => (
            <Stack
              key={message.id}
              horizontal={message.role === 'user'}
              horizontalAlign={message.role === 'user' ? 'end' : 'start'}
              tokens={{ childrenGap: 8 }}
            >
              {message.role === 'assistant' && (
                <Bot20Regular style={{ fontSize: '16px', color: '#0078d4', marginTop: '4px' }} />
              )}
              
              <Stack
                styles={{
                  root: {
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: message.role === 'user' ? '#0078d4' : '#f3f2f1',
                    color: message.role === 'user' ? '#ffffff' : '#323130'
                  }
                }}
              >
                <Text 
                  variant="small" 
                  styles={{ 
                    root: { 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.4'
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
                      marginTop: '4px'
                    } 
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Stack>

              {message.role === 'user' && (
                <Person20Regular style={{ fontSize: '16px', color: '#605e5c', marginTop: '4px' }} />
              )}
            </Stack>
          ))}

          {isLoading && (
            <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="start">
              <Bot20Regular style={{ fontSize: '16px', color: '#0078d4', marginTop: '4px' }} />
              <Stack
                styles={{
                  root: {
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f3f2f1'
                  }
                }}
              >
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <Spinner size={SpinnerSize.xSmall} />
                  <Text variant="small">Refining template...</Text>
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
            padding: '16px',
            borderTop: '1px solid #e1e1e1',
            backgroundColor: '#f8f9fa'
          }
        }}
      >
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
          <TextField
            placeholder="Ask me to improve the template..."
            value={currentMessage}
            onChange={(_, newValue) => setCurrentMessage(newValue || '')}
            onKeyPress={handleKeyPress}
            multiline
            autoAdjustHeight
            disabled={isLoading}
            styles={{ root: { flex: 1 } }}
          />
          <PrimaryButton
            text="Send"
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            iconProps={{ iconName: 'Send' }}
          />
        </Stack>
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
