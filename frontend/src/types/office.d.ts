// TypeScript declarations for Office.js
declare global {
  interface Window {
    Office: typeof Office;
  }
}

// Extend Office namespace if needed
declare namespace Office {
  // Add any custom Office.js types or extensions here if needed
}

// Email context types
export interface OfficeEmailData {
  subject: string;
  from: string;
  body: string;
  conversationId?: string;
  internetMessageId?: string;
}

export interface OfficeContextState {
  isOfficeInitialized: boolean;
  currentEmail: OfficeEmailData | null;
  loading: boolean;
  error: string | null;
}

export {};
