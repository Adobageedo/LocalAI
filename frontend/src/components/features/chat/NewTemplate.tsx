/**
 * Refactored Chat Interface Component
 * Clean, modular, and maintainable
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Stack,
  TextField,
  PrimaryButton,
  IconButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  IStackTokens,
  getTheme,
} from '@fluentui/react';
import { useOffice } from '../../../contexts/OfficeContext';
import { useQuickAction } from '../../../contexts/QuickActionContext';
import { hasEmailAttachments, getAttachmentCount } from '../../../utils/helpers/attachmentBackend.helpers';
import { LLM_QUICK_ACTIONS_DICTIONARY } from '../../../config/llmQuickActions';

// Types
import { TemplateChatInterfaceProps, ChatSettings } from './types';

// Hooks
import { useChatMessages } from './hooks/useChatMessages';
import { useQuickActionSync } from './hooks/useQuickActionSync';
import { useMessageSender } from './hooks/useMessageSender';

// Components
import { ChatMessage } from './components/ChatMessage';
import { SettingsMenu } from './components/SettingsMenu';
import { QuickActionButtons } from './components/QuickActionButtons';
import { StatusIndicator } from './components/StatusIndicator';

// Utils
import { findLastAssistantMessageIndex, isNewConversation } from './utils/messageUtils';

// Styles
import './styles/animations.css';

/**
 * Main Chat Interface Component
 */
const TemplateChatInterface: React.FC<TemplateChatInterfaceProps> = ({
  compose,
  quickActionKey,
  llmActionProposal = [
    { actionKey: 'reply' },
    { actionKey: 'generate' },
    { actionKey: 'correct' },
    { actionKey: 'reformulate' },
    { actionKey: 'summarize', email: true }
  ]
}) => {
  // Context
  const { currentEmail } = useOffice();
  const quickActionContext = useQuickAction();
  
  // Refs
  const scrollableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLDivElement>(null);
  
  // Theme & Tokens
  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };

  // Generate conversationId and emailContext
  const conversationId = currentEmail?.conversationId || 
                        currentEmail?.internetMessageId || 
                        'default-conversation';
  
  const emailContext = {
    subject: currentEmail?.subject,
    from: currentEmail?.from,
    body: currentEmail?.body,
  };

  // State
  const [currentMessage, setCurrentMessage] = useState('');
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);
  const [lastClickedButton, setLastClickedButton] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    useRag: false,
    useFineTune: false,
    includeAttachments: true,
  });

  // Custom hooks
  const { messages, setMessages } = useChatMessages({
    conversationId,
    quickActionKey
  });

  useQuickActionSync({
    quickActionState: quickActionContext.state,
    setMessages
  });

  const hasAttachments = hasEmailAttachments();
  
  const { sendMessage, isLoading, error, setError } = useMessageSender({
    conversationId,
    emailContext,
    compose,
    hasAttachments,
    settings,
    messages,
    setMessages
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle quick action button click
  const handleQuickAction = (
    actionKey: string,
    customPrompt?: string,
    additionalContext?: string
  ) => {
    const actionConfig = LLM_QUICK_ACTIONS_DICTIONARY[actionKey];
    if (!actionConfig) return;

    const displayPrompt = customPrompt || actionConfig.userPrompt;

    if (lastQuickAction === actionKey) {
      // Second click → send message
      let fullMessage = currentMessage;
      if (additionalContext) {
        fullMessage += additionalContext;
      }
      sendMessage(fullMessage);
      setLastQuickAction(null);
    } else {
      // First click → populate input
      let fullMessage = displayPrompt;
      if (additionalContext) {
        fullMessage += additionalContext;
      }
      setCurrentMessage(fullMessage);
      setLastQuickAction(actionKey);
    }
  };

  // Handle suggested button click
  const handleSuggestedButtonClick = (label: string, action: string) => {
    const buttonKey = `${label}-${action}`;
    
    if (lastClickedButton === buttonKey) {
      // Second click - send message
      sendMessage(action);
      setLastClickedButton(null);
    } else {
      // First click - populate input
      setCurrentMessage(action);
      setLastClickedButton(buttonKey);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      sendMessage(currentMessage);
      setCurrentMessage('');
      setLastClickedButton(null);
    }
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const lastAssistantIndex = findLastAssistantMessageIndex(messages);
  const isNew = isNewConversation(messages);

  return (
    <Stack
      tokens={stackTokens}
      styles={{
        root: {
          width: '100%',
          borderRadius: 12,
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* Status Indicator */}
      <StatusIndicator
        status={quickActionContext.state.status}
        statusMessage={quickActionContext.state.statusMessage}
        isActive={quickActionContext.state.isActive}
      />

      {/* Error Message */}
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError('')}
        >
          {error}
        </MessageBar>
      )}

      {/* Messages Area */}
      <div
        ref={scrollableRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          backgroundColor: '#f5f5f5'
        }}
      >
        {messages.map((m, msgIndex) => (
          <ChatMessage
            key={m.id}
            message={m}
            isLastAssistant={m.role === 'assistant' && msgIndex === lastAssistantIndex}
            isLoading={isLoading}
            lastClickedButton={lastClickedButton}
            onButtonClick={handleSuggestedButtonClick}
          />
        ))}

        {isLoading && !messages.some(m => m.role === 'assistant' && !m.content) && (
          <div style={{ textAlign: 'left', marginBottom: 12 }}>
            <Spinner size={SpinnerSize.small} label="Réflexion en cours..." />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Buttons */}
      {isNew && llmActionProposal.length > 0 && (
        <QuickActionButtons
          actions={llmActionProposal}
          onActionClick={handleQuickAction}
        />
      )}

      {/* Input Area */}
      <Stack
        horizontal
        tokens={{ childrenGap: 8 }}
        styles={{
          root: {
            padding: 16,
            borderTop: `1px solid ${theme.palette.neutralLight}`,
            backgroundColor: theme.palette.white
          }
        }}
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

        {/* Settings Button */}
        <div ref={settingsButtonRef}>
          <IconButton
            iconProps={{ iconName: 'Settings' }}
            title="Paramètres"
            ariaLabel="Paramètres"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            styles={{
              root: {
                height: 40,
                width: 40,
                borderRadius: 20,
                border: `1px solid ${theme.palette.neutralLight}`,
                backgroundColor: showSettingsMenu
                  ? theme.palette.themeLighter
                  : theme.palette.white,
              },
              icon: {
                fontSize: 16,
                color: showSettingsMenu
                  ? theme.palette.themePrimary
                  : theme.palette.neutralSecondary,
              },
            }}
          />
        </div>

        {/* Settings Menu */}
        <SettingsMenu
          targetRef={settingsButtonRef}
          isOpen={showSettingsMenu}
          settings={settings}
          hasAttachments={hasAttachments}
          attachmentCount={getAttachmentCount()}
          onDismiss={() => setShowSettingsMenu(false)}
          onSettingsChange={handleSettingsChange}
        />

        {/* Send Button */}
        <PrimaryButton
          text="Envoyer"
          onClick={handleSendMessage}
          disabled={!currentMessage.trim() || isLoading}
          iconProps={{ iconName: 'Send' }}
          styles={{
            root: {
              minWidth: 100,
              height: 40,
              borderRadius: 20,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              ':hover': {
                transform: 'scale(1.05)',
              },
            },
          }}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
