import { IButtonStyles } from '@fluentui/react';
import { theme } from '../theme';

/**
 * Universal Button Styles
 * Reusable button styles for consistent UI across the app
 */

// Primary button style
export const primaryButtonStyles: IButtonStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    height: 44,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    minWidth: 120,
    transition: theme.transitions.normal,
    boxShadow: theme.shadows.sm,
    '&:hover': {
      boxShadow: theme.shadows.md,
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: theme.shadows.sm,
    },
    [theme.mediaQueries.tablet]: {
      height: 40,
      fontSize: theme.typography.fontSize.sm,
      minWidth: 100,
    },
    [theme.mediaQueries.mobile]: {
      height: 36,
      fontSize: theme.typography.fontSize.sm,
      minWidth: 80,
      padding: `0 ${theme.spacing.md}px`,
    },
  },
  rootHovered: {
    boxShadow: theme.shadows.md,
  },
  rootPressed: {
    boxShadow: theme.shadows.sm,
  },
};

// Secondary button style
export const secondaryButtonStyles: IButtonStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    height: 44,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    minWidth: 100,
    border: `2px solid ${theme.colors.border}`,
    transition: theme.transitions.normal,
    backgroundColor: theme.colors.white,
    '&:hover': {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLighter,
    },
    [theme.mediaQueries.tablet]: {
      height: 40,
      fontSize: theme.typography.fontSize.sm,
      minWidth: 90,
    },
    [theme.mediaQueries.mobile]: {
      height: 36,
      fontSize: theme.typography.fontSize.sm,
      minWidth: 70,
      padding: `0 ${theme.spacing.sm}px`,
    },
  },
};

// Icon button style
export const iconButtonStyles: IButtonStyles = {
  root: {
    borderRadius: theme.borderRadius.medium,
    width: 40,
    height: 40,
    transition: theme.transitions.normal,
    '&:hover': {
      backgroundColor: theme.colors.primaryLighter,
      transform: 'scale(1.05)',
    },
    [theme.mediaQueries.mobile]: {
      width: 36,
      height: 36,
    },
  },
};

// Compact button style
export const compactButtonStyles: IButtonStyles = {
  root: {
    borderRadius: theme.borderRadius.medium,
    height: 32,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    minWidth: 80,
    padding: `0 ${theme.spacing.md}px`,
    transition: theme.transitions.normal,
  },
};

// Action button style (for prominent actions)
export const actionButtonStyles: IButtonStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    height: 48,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    minWidth: 140,
    boxShadow: theme.shadows.md,
    transition: theme.transitions.normal,
    '&:hover': {
      boxShadow: theme.shadows.lg,
      transform: 'translateY(-2px)',
    },
    [theme.mediaQueries.mobile]: {
      height: 44,
      fontSize: theme.typography.fontSize.md,
      minWidth: 120,
    },
  },
};
