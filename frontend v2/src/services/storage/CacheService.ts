/**
 * Cache Service
 * Service pour gérer le cache en mémoire et localStorage
 */

import StorageService from './StorageService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private static memoryCache: Map<string, CacheEntry<any>> = new Map();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_PREFIX = 'cache';

  /**
   * Mettre en cache
   */
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL, persistent: boolean = false): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Cache mémoire
    this.memoryCache.set(key, entry);

    // Cache persistant (localStorage)
    if (persistent) {
      StorageService.setWithPrefix(this.CACHE_PREFIX, key, entry);
    }
  }

  /**
   * Obtenir depuis le cache
   */
  static get<T>(key: string): T | null {
    // Essayer le cache mémoire d'abord
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (this.isValid(memEntry)) {
        return memEntry.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Essayer le cache persistant
    const storageEntry = StorageService.getWithPrefix<CacheEntry<T>>(this.CACHE_PREFIX, key);
    if (storageEntry && this.isValid(storageEntry)) {
      // Remettre en cache mémoire
      this.memoryCache.set(key, storageEntry);
      return storageEntry.data;
    }

    return null;
  }

  /**
   * Vérifier si une entrée est valide
   */
  private static isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Supprimer du cache
   */
  static remove(key: string): void {
    this.memoryCache.delete(key);
    StorageService.removeWithPrefix(this.CACHE_PREFIX + ':' + key);
  }

  /**
   * Nettoyer le cache expiré
   */
  static cleanExpired(): void {
    // Nettoyer cache mémoire
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Nettoyer cache persistant
    const keys = StorageService.getKeysWithPrefix(this.CACHE_PREFIX);
    for (const fullKey of keys) {
      const entry = StorageService.get<CacheEntry<any>>(fullKey);
      
      if (entry && !this.isValid(entry)) {
        StorageService.remove(fullKey);
      }
    }
  }

  /**
   * Nettoyer tout le cache
   */
  static clear(): void {
    this.memoryCache.clear();
    StorageService.removeWithPrefix(this.CACHE_PREFIX);
  }

  /**
   * Obtenir ou créer (avec fonction factory)
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    persistent: boolean = false
  ): Promise<T> {
    // Vérifier le cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Créer la valeur
    const data = await factory();

    // Mettre en cache
    this.set(key, data, ttl, persistent);

    return data;
  }

  /**
   * Invalidate cache with pattern
   */
  static invalidatePattern(pattern: string): void {
    // Cache mémoire
    const memKeys = Array.from(this.memoryCache.keys());
    for (const key of memKeys) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Cache persistant
    const storageKeys = StorageService.getKeysWithPrefix(this.CACHE_PREFIX);
    for (const fullKey of storageKeys) {
      if (fullKey.includes(pattern)) {
        StorageService.remove(fullKey);
      }
    }
  }

  /**
   * Obtenir la taille du cache mémoire
   */
  static getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }

  /**
   * Obtenir toutes les clés du cache
   */
  static keys(): string[] {
    const memKeys = Array.from(this.memoryCache.keys());
    const storageKeys = StorageService.getKeysWithPrefix(this.CACHE_PREFIX)
      .map(key => key.replace(`${this.CACHE_PREFIX}:`, ''));
    
    // Combiner et dédupliquer
    return Array.from(new Set([...memKeys, ...storageKeys]));
  }

  /**
   * Vérifier si une clé est en cache
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Obtenir des statistiques du cache
   */
  static getStats(): {
    memorySize: number;
    persistentSize: number;
    totalKeys: number;
    expiredKeys: number;
  } {
    let expiredKeys = 0;

    // Compter les expirés en mémoire
    for (const entry of this.memoryCache.values()) {
      if (!this.isValid(entry)) {
        expiredKeys++;
      }
    }

    // Compter les expirés dans le storage
    const storageKeys = StorageService.getKeysWithPrefix(this.CACHE_PREFIX);
    for (const fullKey of storageKeys) {
      const entry = StorageService.get<CacheEntry<any>>(fullKey);
      if (entry && !this.isValid(entry)) {
        expiredKeys++;
      }
    }

    return {
      memorySize: this.memoryCache.size,
      persistentSize: storageKeys.length,
      totalKeys: this.keys().length,
      expiredKeys
    };
  }
}

export default CacheService;
