import { IMessageBarStyles } from '@fluentui/react';
import { theme } from '../theme';

/**
 * Universal Message Styles
 * Reusable message bar styles for consistent notifications
 */

export const messageBarStyles: IMessageBarStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    boxShadow: theme.shadows.sm,
    [theme.mediaQueries.mobile]: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
  },
};

// Success message style
export const successMessageStyles: IMessageBarStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    boxShadow: theme.shadows.sm,
    backgroundColor: theme.colors.successLight,
    border: `1px solid ${theme.colors.success}`,
    [theme.mediaQueries.mobile]: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
  },
};

// Error message style
export const errorMessageStyles: IMessageBarStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    boxShadow: theme.shadows.sm,
    backgroundColor: theme.colors.errorLight,
    border: `1px solid ${theme.colors.error}`,
    [theme.mediaQueries.mobile]: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
  },
};

// Warning message style
export const warningMessageStyles: IMessageBarStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    boxShadow: theme.shadows.sm,
    backgroundColor: theme.colors.warningLight,
    border: `1px solid ${theme.colors.warning}`,
    [theme.mediaQueries.mobile]: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
  },
};

// Info message style
export const infoMessageStyles: IMessageBarStyles = {
  root: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    boxShadow: theme.shadows.sm,
    backgroundColor: theme.colors.infoLight,
    border: `1px solid ${theme.colors.info}`,
    [theme.mediaQueries.mobile]: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
  },
};
