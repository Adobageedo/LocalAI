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
import { ActionButtons } from '../../common';
import { useOffice } from '../../../contexts/OfficeContext';
import { useQuickAction } from '../../../contexts/QuickActionContext';
import { hasEmailAttachments, getAttachmentCount } from '../../../utils/helpers/attachmentBackend.helpers';
import { LLM_QUICK_ACTIONS_DICTIONARY } from '../../../config/llmQuickActions';
import { useTemplateGeneration } from '../../../hooks';

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
  const {
    // Actions
  } = useTemplateGeneration();
  // Refs
  const scrollableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];
  // Theme & Tokens
  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };
  const diyconversationID = currentEmail?.conversationId 
    ? `${currentEmail.conversationId}` 
    : currentEmail?.subject && currentEmail?.date 
      ? `${currentEmail.subject}-${currentEmail.date.toISOString()}` 
      : `today-${today}`;

      // Generate conversationId and emailContext
  const conversationId = diyconversationID;
  // const conversationId = currentEmail?.conversationId || 
  //                       (currentEmail?.subject ? currentEmail.subject + new Date().getTime().toString() : undefined) || 
  //                       'default-conversation';
  
  const emailContext = {
    subject: currentEmail?.subject,
    from: currentEmail?.from,
    body: currentEmail?.body,
    date: currentEmail?.date?.toISOString(),
  };

  // State
  const [currentMessage, setCurrentMessage] = useState('');
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);
  const [lastClickedButton, setLastClickedButton] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    useRag: true,
    useFineTune: false,
    includeAttachments: true,
  });

  // Custom hooks
  const { messages, setMessages, handleNewTemplate, hasAssistantMessage, handleInsertTemplate } = useChatMessages({
    conversationId,
    quickActionKey,
    compose
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

  // Detect scroll position and show/hide scroll button
  useEffect(() => {
    const container = scrollableRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smart auto-scroll: only scroll if user is near bottom
  useEffect(() => {
    if (!scrollableRef.current) return;
    
    const container = scrollableRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    // Only auto-scroll if user is already near the bottom (not scrolling up to read)
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      handleSendMessage();
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
      // Second click - send message using the same logic as the Send button
      // action already contains the prepared prompt + context
      handleSendMessage();
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

  // Handle insert template with error handling
  const handleInsertTemplateClick = async () => {
    try {
      await handleInsertTemplate(true); // includeHistory = true
      // Success - could show a success message if needed
    } catch (err: any) {
      setError(err.message || 'Failed to insert template');
    }
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
          backgroundColor: '#f5f5f5',
          position: 'relative'
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

        {/* Right side buttons - vertical stack */}
        <Stack tokens={{ childrenGap: 4 }} verticalAlign="space-between">
          {/* Send Button - Top */}
          <IconButton
            iconProps={{ iconName: 'Send' }}
            title="Envoyer"
            ariaLabel="Envoyer le message"
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            styles={{
              root: {
                height: 40,
                width: 40,
                borderRadius: 20,
                backgroundColor: (!currentMessage.trim() || isLoading)
                  ? theme.palette.neutralLight
                  : theme.palette.themePrimary,
                border: 'none',
                transition: 'all 0.2s ease',
                ':hover': {
                  backgroundColor: (!currentMessage.trim() || isLoading)
                    ? theme.palette.neutralLight
                    : theme.palette.themeDark,
                  transform: (!currentMessage.trim() || isLoading) ? 'none' : 'scale(1.05)',
                },
              },
              icon: {
                fontSize: 16,
                color: (!currentMessage.trim() || isLoading)
                  ? theme.palette.neutralTertiary
                  : theme.palette.white,
              },
            }}
          />

          {/* Settings Button - Bottom */}
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
        </Stack>

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
      </Stack>
      {/* Compact Action Bar at Bottom */}
      <Stack
        styles={{
          root: {
            borderTop: `1px solid ${theme.palette.neutralLight}`,
            padding: `${theme.spacing.s1}px ${theme.spacing.m}px`,
            backgroundColor: theme.palette.neutralLighter,
          }
        }}
      >
        <ActionButtons
          onNewTemplate={handleNewTemplate}
          onInsertTemplate={() => handleInsertTemplate(true)}
          hasTemplate={hasAssistantMessage()}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
