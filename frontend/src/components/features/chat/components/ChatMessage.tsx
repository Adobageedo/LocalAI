/**
 * Individual chat message component
 */

import React from 'react';
import { Stack, Text, DefaultButton, getTheme } from '@fluentui/react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
  isLoading: boolean;
  lastClickedButton: string | null;
  onButtonClick: (label: string, action: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLastAssistant,
  isLoading,
  lastClickedButton,
  onButtonClick
}) => {
  const theme = getTheme();

  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        animation: 'fadeIn 0.3s ease-in'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
          maxWidth: '80%'
        }}
      >
        {/* Message bubble */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: message.role === 'user'
              ? `linear-gradient(135deg, ${theme.palette.themePrimary} 0%, ${theme.palette.themeDark} 100%)`
              : theme.palette.white,
            color: message.role === 'user' ? 'white' : theme.palette.neutralPrimary,
            padding: '12px 16px',
            borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            maxWidth: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginLeft: message.role === 'assistant' ? 8 : 0,
            marginRight: message.role === 'user' ? 8 : 0,
          }}
        >
          {/* Typing indicator or content */}
          {!message.content && isLoading && message.role === 'assistant' ? (
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary } }}>
                En train d'écrire
              </Text>
            </Stack>
          ) : (
            <Text
              variant="medium"
              style={{
                color: message.role === 'user' ? 'white' : theme.palette.neutralPrimary,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}
            >
              {message.content}
              {isLoading && message.role === 'assistant' && message.content && (
                <span className="cursor-blink">|</span>
              )}
            </Text>
          )}
        </div>

        {/* Suggested action buttons */}
        {isLastAssistant && message.suggestedButtons && message.suggestedButtons.length > 0 && !isLoading && (
          <Stack
            horizontal
            wrap
            tokens={{ childrenGap: 8 }}
            styles={{
              root: {
                marginTop: 8,
                marginLeft: message.role === 'assistant' ? 8 : 0,
                marginRight: message.role === 'user' ? 8 : 0,
              }
            }}
          >
            {message.suggestedButtons.map((btn, idx) => {
              const buttonKey = `${btn.label}-${btn.action}`;
              return (
                <DefaultButton
                  key={idx}
                  text={btn.label}
                  onClick={() => onButtonClick(btn.label, btn.action)}
                  styles={{
                    root: {
                      borderRadius: 16,
                      fontSize: 12,
                      padding: '6px 14px',
                      height: 'auto',
                      minHeight: 32,
                      border: `1px solid ${theme.palette.neutralLight}`,
                      backgroundColor: lastClickedButton === buttonKey
                        ? theme.palette.themeLighter
                        : theme.palette.white,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                      ':hover': {
                        backgroundColor: theme.palette.themeLighter,
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      },
                    }
                  }}
                />
              );
            })}
          </Stack>
        )}
      </div>
    </div>
  );
};
