/**
 * useStorage Hook
 * Hook pour utiliser le localStorage avec React
 */

import { useState, useEffect, useCallback } from 'react';
import StorageService from '@/services/storage/StorageService';

export function useStorage<T>(
  key: string,
  defaultValue: T,
  ttl?: number
): [T, (value: T) => void, () => void] {
  // Initialiser avec la valeur du storage ou la valeur par défaut
  const [value, setValue] = useState<T>(() => {
    const stored = StorageService.get<T>(key);
    return stored !== null ? stored : defaultValue;
  });

  /**
   * Sauvegarder dans le storage quand la valeur change
   */
  useEffect(() => {
    StorageService.set(key, value, ttl);
  }, [key, value, ttl]);

  /**
   * Mettre à jour la valeur
   */
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  /**
   * Supprimer la valeur
   */
  const removeValue = useCallback(() => {
    StorageService.remove(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, updateValue, removeValue];
}

/**
 * Hook pour utiliser le localStorage avec un objet
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
      
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }, [key, defaultValue]);

  return [value, updateValue, removeValue];
}

/**
 * Hook pour utiliser le sessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
      
      try {
        sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error saving to sessionStorage:', error);
      }
      
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.error('Error removing from sessionStorage:', error);
    }
  }, [key, defaultValue]);

  return [value, updateValue, removeValue];
}
