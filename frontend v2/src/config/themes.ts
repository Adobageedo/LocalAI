/**
 * Themes Configuration
 * Configuration des thèmes Fluent UI pour l'application
 */

// Note: createTheme et ITheme seront disponibles après installation de @fluentui/react
// import { createTheme, ITheme, IPalette } from '@fluentui/react';

/**
 * Palette de couleurs personnalisée (compatible Fluent UI)
 */
export const customPalette = {
  themePrimary: '#0078d4',
  themeLighterAlt: '#eff6fc',
  themeLighter: '#deecf9',
  themeLight: '#c7e0f4',
  themeTertiary: '#71afe5',
  themeSecondary: '#2b88d8',
  themeDarkAlt: '#106ebe',
  themeDark: '#005a9e',
  themeDarker: '#004578',
  neutralLighterAlt: '#faf9f8',
  neutralLighter: '#f3f2f1',
  neutralLight: '#edebe9',
  neutralQuaternaryAlt: '#e1dfdd',
  neutralQuaternary: '#d0d0d0',
  neutralTertiaryAlt: '#c8c6c4',
  neutralTertiary: '#a19f9d',
  neutralSecondary: '#605e5c',
  neutralPrimaryAlt: '#3b3a39',
  neutralPrimary: '#323130',
  neutralDark: '#201f1e',
  black: '#000000',
  white: '#ffffff',
  // Couleurs sémantiques
  green: '#107c10',
  greenLight: '#bad80a',
  greenDark: '#004b1c',
  red: '#d13438',
  redDark: '#a4262c',
  yellow: '#ffb900',
  yellowLight: '#fff100',
  orange: '#d83b01',
  orangeLight: '#ea4300',
  orangeLighter: '#ff8c00',
  blue: '#0078d4',
  blueLight: '#00bcf2',
  blueMid: '#00188f',
  blueDark: '#002050'
};

/**
 * Configuration des thèmes disponibles
 */
export const THEME_CONFIG = {
  defaultTheme: 'light' as const,
  availableThemes: ['light', 'dark'] as const,
  palette: customPalette
};

/**
 * Type pour les noms de thème
 */
export type ThemeName = typeof THEME_CONFIG.availableThemes[number];

/**
 * Couleurs personnalisées supplémentaires
 */
export const CUSTOM_COLORS = {
  // Status colors
  success: '#107c10',
  warning: '#ffb900',
  error: '#d13438',
  info: '#0078d4',
  
  // Backgrounds
  successBackground: '#dff6dd',
  warningBackground: '#fff4ce',
  errorBackground: '#fde7e9',
  infoBackground: '#deecf9',
  
  // Gradients
  primaryGradient: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
  successGradient: 'linear-gradient(135deg, #107c10 0%, #004b1c 100%)',
  warningGradient: 'linear-gradient(135deg, #ffb900 0%, #d83b01 100%)',
  
  // Special
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowHover: 'rgba(0, 0, 0, 0.2)'
} as const;

/**
 * Z-index pour la gestion des couches
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080
} as const;

/**
 * Breakpoints pour le design responsive
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1366,
  xxl: 1920
} as const;

/**
 * Helper pour créer des media queries
 */
export const mediaQuery = {
  xs: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  sm: `@media (min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`,
  md: `@media (min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.xl}px)`,
  mobile: `@media (max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `@media (min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.lg}px)`
} as const;

/**
 * Animations communes
 */
export const ANIMATIONS = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 }
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 }
  },
  slideInUp: {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 }
  },
  slideInDown: {
    from: { transform: 'translateY(-20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 }
  },
  scaleIn: {
    from: { transform: 'scale(0.9)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 }
  }
} as const;

/**
 * Durées d'animation
 */
export const ANIMATION_DURATIONS = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms'
} as const;

/**
 * Fonctions de timing pour les animations
 */
export const ANIMATION_TIMINGS = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  cubic: 'cubic-bezier(0.4, 0, 0.2, 1)'
} as const;

/**
 * Theme objects (will use Fluent UI createTheme after npm install)
 * For now, export placeholder objects
 */
export const lightTheme = {
  palette: customPalette,
  semanticColors: {
    bodyBackground: customPalette.white,
    bodyText: customPalette.neutralPrimary
  }
};

export const darkTheme = {
  palette: {
    ...customPalette,
    themePrimary: '#4ba0e8',
    neutralPrimary: '#ffffff',
    neutralPrimaryAlt: '#f3f2f1',
    white: '#000000',
    black: '#ffffff'
  },
  semanticColors: {
    bodyBackground: '#1e1e1e',
    bodyText: '#ffffff'
  }
};
