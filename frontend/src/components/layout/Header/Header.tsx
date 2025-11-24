import React, { useState } from 'react';
import { Stack, Text, IconButton } from '@fluentui/react';
import { Sparkle24Filled } from '@fluentui/react-icons';
import { theme } from '../../../styles';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
  showQuickActions?: boolean;
  onQuickActionsClick?: () => void;
}

/**
 * Universal Header Component
 * Clean, minimal header with optional sidebar toggle
 */
export function Header({ 
  title = 'AI Assistant', 
  subtitle,
  onMenuClick,
  showMenu = false,
  showQuickActions = false,
  onQuickActionsClick
}: HeaderProps) {
  return (
    <Stack 
      horizontal 
      verticalAlign="center" 
      horizontalAlign="space-between"
      styles={{
        root: {
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          backgroundColor: theme.colors.white,
          minHeight: 48,
          boxShadow: theme.shadows.sm,
        }
      }}
    >
      {/* Left side: Logo and Title */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.sm }}>
        {showMenu && (
          <IconButton
            iconProps={{ iconName: 'GlobalNavButton' }}
            title="Menu"
            ariaLabel="Open menu"
            onClick={onMenuClick}
            styles={{
              root: {
                color: theme.colors.text,
                '&:hover': {
                  backgroundColor: theme.colors.primaryLighter,
                }
              }
            }}
          />
        )}
        
        <Sparkle24Filled style={{ color: theme.colors.primary, fontSize: 20 }} />
        
        <Stack tokens={{ childrenGap: 0 }}>
          <Text 
            variant="medium" 
            styles={{ 
              root: { 
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text,
                lineHeight: 1.2,
              } 
            }}
          >
            {title}
          </Text>
          
          {subtitle && (
            <Text 
              variant="small" 
              styles={{ 
                root: { 
                  color: theme.colors.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 300,
                  lineHeight: 1.2,
                  [theme.mediaQueries.mobile]: {
                    display: 'none',
                  }
                } 
              }}
            >
              {subtitle}
            </Text>
          )}
        </Stack>
      </Stack>

      {/* Right side: Actions */}
      <Stack horizontal tokens={{ childrenGap: theme.spacing.xs }}>
        {showQuickActions && (
          <IconButton
            iconProps={{ iconName: 'LightningBolt' }}
            title="Quick Actions"
            ariaLabel="Open quick actions"
            onClick={onQuickActionsClick}
            styles={{
              root: {
                color: theme.colors.primary,
                '&:hover': {
                  backgroundColor: theme.colors.primaryLighter,
                }
              },
              icon: {
                fontSize: 20,
              }
            }}
          />
        )}
      </Stack>
    </Stack>
  );
}

export default Header;
