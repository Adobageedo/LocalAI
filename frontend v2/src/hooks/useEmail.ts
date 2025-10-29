/**
 * useEmail Hook
 * Hook pour gérer les opérations email
 */

import { useState, useCallback } from 'react';
import {
  GenerateEmailRequest,
  CorrectEmailRequest,
  ReformulateEmailRequest,
  SummarizeEmailRequest,
  EmailGenerationResponse
} from '@/models/domain';
import EmailService from '@/services/email/EmailService';

interface UseEmailResult {
  isLoading: boolean;
  error: string | null;
  result: EmailGenerationResponse | null;
  generateEmail: (request: GenerateEmailRequest) => Promise<EmailGenerationResponse>;
  correctEmail: (request: CorrectEmailRequest) => Promise<EmailGenerationResponse>;
  reformulateEmail: (request: ReformulateEmailRequest) => Promise<EmailGenerationResponse>;
  summarizeEmail: (request: SummarizeEmailRequest) => Promise<EmailGenerationResponse>;
  clearResult: () => void;
  clearError: () => void;
}

export function useEmail(): UseEmailResult {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailGenerationResponse | null>(null);

  /**
   * Générer un email
   */
  const generateEmail = useCallback(async (request: GenerateEmailRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await EmailService.generateEmail(request);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Corriger un email
   */
  const correctEmail = useCallback(async (request: CorrectEmailRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await EmailService.correctEmail(request);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to correct email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reformuler un email
   */
  const reformulateEmail = useCallback(async (request: ReformulateEmailRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await EmailService.reformulateEmail(request);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reformulate email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Résumer un email
   */
  const summarizeEmail = useCallback(async (request: SummarizeEmailRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await EmailService.summarizeEmail(request);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to summarize email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Nettoyer le résultat
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * Nettoyer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    generateEmail,
    correctEmail,
    reformulateEmail,
    summarizeEmail,
    clearResult,
    clearError
  };
}
