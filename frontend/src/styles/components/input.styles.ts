import { ITextFieldStyles } from '@fluentui/react';
import { theme } from '../theme';

/**
 * Universal Input Styles
 * Reusable text field styles for consistent inputs
 */

export const textFieldStyles: Partial<ITextFieldStyles> = {
  root: {
    marginBottom: theme.spacing.md,
  },
  fieldGroup: {
    borderRadius: theme.borderRadius.large,
    border: `2px solid ${theme.colors.border}`,
    transition: theme.transitions.normal,
    backgroundColor: theme.colors.white,
    boxShadow: theme.shadows.sm,
    '&:hover': {
      borderColor: theme.colors.primary,
      boxShadow: theme.shadows.md,
    },
    '&:focus-within': {
      borderColor: theme.colors.primary,
      boxShadow: `0 0 0 3px ${theme.colors.primaryLighter}`,
    },
    [theme.mediaQueries.mobile]: {
      borderRadius: theme.borderRadius.medium,
    },
  },
  field: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.normal,
    padding: theme.spacing.md,
    '&::placeholder': {
      color: theme.colors.textLight,
    },
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
    color: theme.colors.error,
  },
};

export const multilineTextFieldStyles: Partial<ITextFieldStyles> = {
  root: {
    marginBottom: theme.spacing.md,
  },
  fieldGroup: {
    borderRadius: theme.borderRadius.large,
    border: `2px solid ${theme.colors.border}`,
    transition: theme.transitions.normal,
    backgroundColor: theme.colors.white,
    boxShadow: theme.shadows.sm,
    '&:hover': {
      borderColor: theme.colors.primary,
      boxShadow: theme.shadows.md,
    },
    '&:focus-within': {
      borderColor: theme.colors.primary,
      boxShadow: `0 0 0 3px ${theme.colors.primaryLighter}`,
    },
  },
  field: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.normal,
    padding: theme.spacing.md,
    minHeight: 120,
  },
};

export const compactTextFieldStyles: Partial<ITextFieldStyles> = {
  root: {
    marginBottom: theme.spacing.md,
  },
  fieldGroup: {
    borderRadius: theme.borderRadius.medium,
    border: `2px solid ${theme.colors.border}`,
    transition: theme.transitions.normal,
    backgroundColor: theme.colors.white,
    '&:hover': {
      borderColor: theme.colors.primary,
    },
  },
  field: {
    fontSize: theme.typography.fontSize.sm,
    padding: theme.spacing.sm,
  },
};
