import { IStackStyles } from '@fluentui/react';
import { theme } from '../theme';

/**
 * Universal Card Styles
 * Reusable card styles for consistent containers across the app
 */

// Base card style
export const cardStyles: IStackStyles = {
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    transition: theme.transitions.normal,
    border: `1px solid ${theme.colors.borderLight}`,
    [theme.mediaQueries.tablet]: {
      padding: theme.spacing.md,
    },
    [theme.mediaQueries.mobile]: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
    },
  },
};

// Elevated card style
export const elevatedCardStyles: IStackStyles = {
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.md,
    transition: theme.transitions.normal,
    border: `1px solid ${theme.colors.borderLight}`,
    '&:hover': {
      boxShadow: theme.shadows.lg,
      transform: 'translateY(-2px)',
    },
    [theme.mediaQueries.tablet]: {
      padding: theme.spacing.md,
    },
    [theme.mediaQueries.mobile]: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
    },
  },
};

// Highlight card style (for special content)
export const highlightCardStyles: IStackStyles = {
  root: {
    backgroundColor: theme.colors.backgroundHighlight,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xl,
    border: `2px solid ${theme.colors.primary}`,
    boxShadow: theme.shadows.sm,
    [theme.mediaQueries.tablet]: {
      padding: theme.spacing.lg,
      flexDirection: 'column' as const,
      gap: theme.spacing.md,
    },
    [theme.mediaQueries.mobile]: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
    },
  },
};

// Compact card style
export const compactCardStyles: IStackStyles = {
  root: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.borderLight}`,
    [theme.mediaQueries.mobile]: {
      padding: theme.spacing.sm,
    },
  },
};

// Interactive card style (clickable/hoverable)
export const interactiveCardStyles: IStackStyles = {
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    transition: theme.transitions.normal,
    border: `1px solid ${theme.colors.borderLight}`,
    cursor: 'pointer',
    '&:hover': {
      boxShadow: theme.shadows.md,
      borderColor: theme.colors.primary,
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: theme.shadows.sm,
    },
    [theme.mediaQueries.tablet]: {
      padding: theme.spacing.md,
    },
    [theme.mediaQueries.mobile]: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
    },
  },
};
