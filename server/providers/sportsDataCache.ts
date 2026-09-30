interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * SportsDataCache: High-performance in-memory cache with TTL expiration.
 * Protects external API rate limits and prevents redundant HTTP traffic.
 */
export class SportsDataCache {
  private static cache: Map<string, CacheEntry<any>> = new Map();

  // Default TTL constants in seconds
  public static readonly TTL_ODDS = 900; // 15 minutes
  public static readonly TTL_FIXTURES = 3600; // 1 hour
  public static readonly TTL_STANDINGS = 21600; // 6 hours
  public static readonly TTL_H2H = 86400; // 24 hours

  public static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public static set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public static has(key: string): boolean {
    return this.get(key) !== null;
  }

  public static delete(key: string): void {
    this.cache.delete(key);
  }

  public static clear(): void {
    this.cache.clear();
  }

  public static size(): number {
    return this.cache.size;
  }
}
