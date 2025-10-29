/**
 * Storage Service
 * Service pour gérer le stockage local (localStorage)
 */

import { isPersistentKey, getTTL } from '@/config/storage';

interface StorageItem<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export class StorageService {
  /**
   * Sauvegarder une valeur
   */
  static set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || getTTL(key)
      };

      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Error saving to storage:', error);
      this.handleQuotaExceeded();
    }
  }

  /**
   * Obtenir une valeur
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) {
        return defaultValue || null;
      }

      const item: StorageItem<T> = JSON.parse(itemStr);

      // Vérifier l'expiration
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return defaultValue || null;
      }

      return item.value;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return defaultValue || null;
    }
  }

  /**
   * Supprimer une valeur
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }

  /**
   * Vérifier si une clé existe
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Nettoyer les données expirées
   */
  static cleanExpired(): void {
    try {
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) continue;

        try {
          const item: StorageItem<any> = JSON.parse(itemStr);
          
          if (item.ttl && Date.now() - item.timestamp > item.ttl) {
            // Ne pas supprimer les clés persistantes
            if (!isPersistentKey(key)) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Ignorer les erreurs de parsing
        }
      }
    } catch (error) {
      console.error('Error cleaning storage:', error);
    }
  }

  /**
   * Nettoyer tout le storage (sauf clés persistantes)
   */
  static clear(includePersistent: boolean = false): void {
    try {
      if (includePersistent) {
        localStorage.clear();
      } else {
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
          if (!isPersistentKey(key)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Obtenir toutes les clés
   */
  static keys(): string[] {
    return Object.keys(localStorage);
  }

  /**
   * Obtenir la taille utilisée (approximation)
   */
  static getSize(): number {
    let size = 0;
    
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    
    return size;
  }

  /**
   * Obtenir la taille utilisée en format lisible
   */
  static getSizeFormatted(): string {
    const bytes = this.getSize();
    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb > 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb > 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  }

  /**
   * Vérifier si le quota est dépassé
   */
  static isQuotaExceeded(): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB approximatif
    return this.getSize() > maxSize * 0.9; // 90% du quota
  }

  /**
   * Gérer le dépassement de quota
   */
  private static handleQuotaExceeded(): void {
    // Nettoyer les données expirées
    this.cleanExpired();

    // Si toujours plein, supprimer les plus anciennes données non persistantes
    if (this.isQuotaExceeded()) {
      const items: Array<{ key: string; timestamp: number }> = [];

      for (const key of this.keys()) {
        if (isPersistentKey(key)) continue;

        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            items.push({ key, timestamp: item.timestamp || 0 });
          }
        } catch {
          // Ignorer
        }
      }

      // Trier par timestamp et supprimer les plus vieux
      items.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = Math.ceil(items.length * 0.2); // Supprimer 20%

      for (let i = 0; i < toRemove && i < items.length; i++) {
        this.remove(items[i].key);
      }
    }
  }

  /**
   * Sauvegarder un objet avec préfixe
   */
  static setWithPrefix<T>(prefix: string, key: string, value: T): void {
    this.set(`${prefix}:${key}`, value);
  }

  /**
   * Obtenir un objet avec préfixe
   */
  static getWithPrefix<T>(prefix: string, key: string, defaultValue?: T): T | null {
    return this.get(`${prefix}:${key}`, defaultValue);
  }

  /**
   * Obtenir toutes les clés avec un préfixe
   */
  static getKeysWithPrefix(prefix: string): string[] {
    return this.keys().filter(key => key.startsWith(`${prefix}:`));
  }

  /**
   * Supprimer toutes les clés avec un préfixe
   */
  static removeWithPrefix(prefix: string): void {
    const keys = this.getKeysWithPrefix(prefix);
    keys.forEach(key => this.remove(key));
  }

  /**
   * Exporter toutes les données
   */
  static export(): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const key of this.keys()) {
      try {
        const value = this.get(key);
        if (value !== null) {
          data[key] = value;
        }
      } catch {
        // Ignorer les erreurs
      }
    }
    
    return data;
  }

  /**
   * Importer des données
   */
  static import(data: Record<string, any>): void {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this.set(key, data[key]);
      }
    }
  }
}

export default StorageService;
