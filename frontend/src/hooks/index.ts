// Custom Hooks - Barrel Exports

// Utility Hooks
export * from './useDebounce';
export * from './useLocalStorage';
export * from './useEmailComposer';
export * from './useTranslations';

// Feature Hooks
export { useTemplateGeneration } from './useTemplateGeneration';

// Re-export context hooks from their sources
export { useAuth } from '../contexts/AuthContext';
export { useOffice } from '../contexts/OfficeContext';
