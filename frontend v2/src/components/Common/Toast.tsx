/**
 * Toast Component
 * Notifications toast pour feedback utilisateur
 */

import { MessageBar, MessageBarType } from '@fluentui/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
}

const MESSAGE_BAR_TYPE_MAP: Record<ToastType, MessageBarType> = {
  success: MessageBarType.success,
  error: MessageBarType.error,
  warning: MessageBarType.warning,
  info: MessageBarType.info,
};

export default function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <MessageBar
        messageBarType={MESSAGE_BAR_TYPE_MAP[type]}
        onDismiss={onDismiss}
        dismissButtonAriaLabel="Fermer"
        isMultiline={false}
      >
        {message}
      </MessageBar>
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
