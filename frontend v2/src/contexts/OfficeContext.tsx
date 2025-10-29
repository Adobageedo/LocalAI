/**
 * Office Context
 * Context pour gérer l'état Office.js
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EmailContext } from '@/models/domain';
import { useOutlook } from '@/hooks/useOutlook';

interface OfficeContextType {
  isOfficeReady: boolean;
  isOfficeAvailable: boolean;
  emailContext: EmailContext | null;
  refreshContext: () => Promise<void>;
  insertContent: (content: string, mode?: 'replace' | 'append') => Promise<void>;
  setSubject: (subject: string) => Promise<void>;
  addRecipients: (emails: string[], type?: 'to' | 'cc' | 'bcc') => Promise<void>;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

interface OfficeProviderProps {
  children: ReactNode;
}

/**
 * Office Provider Component
 */
export function OfficeProvider({ children }: OfficeProviderProps) {
  const [isOfficeReady, setIsOfficeReady] = useState<boolean>(false);
  const outlook = useOutlook();

  /**
   * Initialiser Office.js
   */
  useEffect(() => {
    if (typeof Office !== 'undefined') {
      Office.onReady(() => {
        setIsOfficeReady(true);
        console.log('Office.js is ready');
      });
    } else {
      // Mode développement sans Office.js
      setIsOfficeReady(true);
      console.log('Running without Office.js (development mode)');
    }
  }, []);

  const value: OfficeContextType = {
    isOfficeReady,
    isOfficeAvailable: outlook.isOfficeAvailable,
    emailContext: outlook.emailContext,
    refreshContext: outlook.refreshContext,
    insertContent: outlook.insertContent,
    setSubject: outlook.setSubject,
    addRecipients: outlook.addRecipients
  };

  return (
    <OfficeContext.Provider value={value}>
      {children}
    </OfficeContext.Provider>
  );
}

/**
 * Hook pour utiliser le OfficeContext
 */
export function useOffice(): OfficeContextType {
  const context = useContext(OfficeContext);
  
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  
  return context;
}
