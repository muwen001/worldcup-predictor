import { getApiConfig, type DataSourceStatus } from './apiConfig';

// ============================================================================
// 本地缓存管理器
// 使用 localStorage 缓存 API 数据，减少请求频率
// 支持 TTL 过期机制
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source: string;
}

interface CacheKeys {
  matches: string;
  odds: string;
  standings: string;
  teams: string;
  sourceStatus: string;
}

const CACHE_PREFIX = 'wc2026_cache_';

const KEYS: CacheKeys = {
  matches: `${CACHE_PREFIX}matches`,
  odds: `${CACHE_PREFIX}odds`,
  standings: `${CACHE_PREFIX}standings`,
  teams: `${CACHE_PREFIX}teams`,
  sourceStatus: `${CACHE_PREFIX}source_status`,
};

export class CacheManager {
  private getKey(key: string): string {
    return key;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (this.isExpired(entry)) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, source: string, customTtl?: number): void {
    try {
      const config = getApiConfig();
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: customTtl || config.cacheTtl,
        source,
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch {
      // Storage quota exceeded, try clearing old caches
      this.clearOldCaches();
    }
  }

  private clearOldCaches(): void {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const entry: CacheEntry<unknown> = JSON.parse(raw);
            if (this.isExpired(entry)) {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // Can't clear caches
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }

  getMatchesCache<T>(): T | null {
    return this.get<T>(KEYS.matches);
  }

  setMatchesCache<T>(data: T, source: string): void {
    this.set(KEYS.matches, data, source);
  }

  getOddsCache<T>(): T | null {
    return this.get<T>(KEYS.odds);
  }

  setOddsCache<T>(data: T, source: string): void {
    this.set(KEYS.odds, data, source);
  }

  getStandingsCache<T>(): T | null {
    return this.get<T>(KEYS.standings);
  }

  setStandingsCache<T>(data: T, source: string): void {
    this.set(KEYS.standings, data, source);
  }

  getTeamsCache<T>(): T | null {
    return this.get<T>(KEYS.teams);
  }

  setTeamsCache<T>(data: T, source: string): void {
    this.set(KEYS.teams, data, source);
  }

  getSourceStatusCache(): DataSourceStatus[] | null {
    return this.get<DataSourceStatus[]>(KEYS.sourceStatus);
  }

  setSourceStatusCache(data: DataSourceStatus[]): void {
    this.set(KEYS.sourceStatus, data, 'internal', 60 * 1000); // 1 minute
  }
}

export const cacheManager = new CacheManager();
