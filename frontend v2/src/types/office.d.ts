/**
 * Office.js Global Type Declarations
 * Déclarations TypeScript pour l'objet global Office
 */

declare namespace Office {
  interface Context {
    displayLanguage?: string;
    mailbox?: {
      item?: any;
    };
  }

  enum AsyncResultStatus {
    Succeeded = 0,
    Failed = 1
  }

  enum CoercionType {
    Text = 0,
    Html = 1
  }

  const context: Context;

  function onReady(callback?: (info?: any) => void): Promise<any>;
}

// Déclarer Office comme variable globale
declare const Office: typeof Office;
