import { getTheme, ITheme, IStyle } from '@fluentui/react';

/**
 * Application Theme Configuration
 * Centralized theme for consistent styling across the app
 */

// Get Fluent UI base theme
const fluentTheme = getTheme();

// Color palette
export const colors = {
  // Primary colors
  primary: fluentTheme.palette.themePrimary,
  primaryLight: fluentTheme.palette.themeLighter,
  primaryLighter: fluentTheme.palette.themeLighterAlt,
  primaryDark: fluentTheme.palette.themeDark,
  
  // Neutral colors
  white: '#ffffff',
  background: '#fafbfc',
  backgroundAlt: '#f3f2f1',
  backgroundHighlight: '#f3f9ff',
  border: fluentTheme.palette.neutralLight,
  borderLight: '#e1e1e1',
  
  // Text colors
  text: fluentTheme.palette.neutralPrimary,
  textSecondary: fluentTheme.palette.neutralSecondary,
  textLight: fluentTheme.palette.neutralTertiary,
  
  // Status colors
  success: '#107c10',
  successLight: '#dff6dd',
  error: '#d13438',
  errorLight: '#fde7e9',
  warning: '#ffaa44',
  warningLight: '#fff4ce',
  info: fluentTheme.palette.themePrimary,
  infoLight: fluentTheme.palette.themeLighterAlt,
} as const;

// Spacing system (8px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Border radius
export const borderRadius = {
  small: 4,
  medium: 8,
  lg: 12,
  large: 12,
  xlarge: 16,
} as const;

// Typography
export const typography = {
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// Transitions
export const transitions = {
  fast: 'all 0.15s ease-in-out',
  normal: 'all 0.2s ease-in-out',
  slow: 'all 0.3s ease-in-out',
} as const;

// Breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

// Media queries
export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.mobile}px)`,
  tablet: `@media (max-width: ${breakpoints.tablet}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  wide: `@media (min-width: ${breakpoints.wide}px)`,
} as const;

// ✨ Effects (✅ Added for backward compatibility)
export const effects = {
  roundedCorner2: borderRadius.lg,
  elevation8: shadows.md,
  elevation16: shadows.lg,
} as const;

// Export complete theme object
export const theme = {
  colors,
  effects,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
  breakpoints,
  mediaQueries,
  fluentTheme, // Include Fluent UI theme for compatibility
} as const;

export type AppTheme = typeof theme;
