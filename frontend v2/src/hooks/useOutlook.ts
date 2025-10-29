/**
 * useOutlook Hook
 * Hook pour interagir avec Outlook via Office.js
 */

import { useState, useEffect, useCallback } from 'react';
import { EmailContext } from '@/models/domain';
import ComposeService from '@/services/email/ComposeService';

interface UseOutlookResult {
  emailContext: EmailContext | null;
  isOfficeAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  refreshContext: () => Promise<void>;
  insertContent: (content: string, mode?: 'replace' | 'append') => Promise<void>;
  setSubject: (subject: string) => Promise<void>;
  addRecipients: (emails: string[], type?: 'to' | 'cc' | 'bcc') => Promise<void>;
}

export function useOutlook(): UseOutlookResult {
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [isOfficeAvailable, setIsOfficeAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Vérifier la disponibilité d'Office.js au montage
   */
  useEffect(() => {
    setIsOfficeAvailable(ComposeService.isOfficeAvailable());
  }, []);

  /**
   * Charger le contexte email au montage
   */
  useEffect(() => {
    const loadContext = async () => {
      if (!isOfficeAvailable) {
        setIsLoading(false);
        return;
      }

      try {
        const context = await ComposeService.getCurrentEmailContext();
        setEmailContext(context);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load email context';
        setError(errorMessage);
        console.error('Error loading email context:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, [isOfficeAvailable]);

  /**
   * Rafraîchir le contexte email
   */
  const refreshContext = useCallback(async () => {
    if (!isOfficeAvailable) {
      throw new Error('Office.js is not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const context = await ComposeService.getCurrentEmailContext();
      setEmailContext(context);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh email context';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOfficeAvailable]);

  /**
   * Insérer du contenu
   */
  const insertContent = useCallback(async (content: string, mode: 'replace' | 'append' = 'replace') => {
    if (!isOfficeAvailable) {
      throw new Error('Office.js is not available');
    }

    setError(null);

    try {
      await ComposeService.insertContent(content, mode);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to insert content';
      setError(errorMessage);
      throw err;
    }
  }, [isOfficeAvailable]);

  /**
   * Définir le sujet
   */
  const setSubject = useCallback(async (subject: string) => {
    if (!isOfficeAvailable) {
      throw new Error('Office.js is not available');
    }

    setError(null);

    try {
      await ComposeService.setSubject(subject);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set subject';
      setError(errorMessage);
      throw err;
    }
  }, [isOfficeAvailable]);

  /**
   * Ajouter des destinataires
   */
  const addRecipients = useCallback(async (emails: string[], type: 'to' | 'cc' | 'bcc' = 'to') => {
    if (!isOfficeAvailable) {
      throw new Error('Office.js is not available');
    }

    setError(null);

    try {
      await ComposeService.addRecipients(emails, type);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add recipients';
      setError(errorMessage);
      throw err;
    }
  }, [isOfficeAvailable]);

  return {
    emailContext,
    isOfficeAvailable,
    isLoading,
    error,
    refreshContext,
    insertContent,
    setSubject,
    addRecipients
  };
}
