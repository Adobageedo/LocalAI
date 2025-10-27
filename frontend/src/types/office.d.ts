// TypeScript declarations for Office.js in case @types/office-js doesn't cover everything
declare global {
  interface Window {
    Office: typeof Office;
  }
}

// Extend Office namespace if needed
declare namespace Office {
  // Add any custom Office.js types or extensions here if needed
}

export {};
