/**
 * Status indicator component for QuickAction states
 */

import React from 'react';
import { Stack, Text, Icon, Spinner, SpinnerSize, getTheme } from '@fluentui/react';

interface StatusIndicatorProps {
  status: string;
  statusMessage: string;
  isActive: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  statusMessage,
  isActive
}) => {
  const theme = getTheme();

  if (!isActive || status === 'idle') return null;

  const getStatusIcon = () => {
    switch (status) {
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

  const statusIcon = getStatusIcon();

  return (
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
      {statusIcon && (
        <Icon
          iconName={statusIcon.iconName}
          styles={{ root: { color: statusIcon.color, fontSize: 16 } }}
        />
      )}
      
      <Text variant="small" styles={{ root: { color: theme.palette.neutralPrimary } }}>
        {statusMessage}
      </Text>
      
      {status !== 'complete' && status !== 'error' && (
        <Spinner size={SpinnerSize.small} />
      )}
    </Stack>
  );
};
