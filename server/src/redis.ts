import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6380', 10);

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.warn(`[Redis] Connection warning: ${err.message}`);
});

export async function connectRedis() {
  try {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
      console.log(`[Redis] Connected to redis://${redisHost}:${redisPort}`);
    }
  } catch (err: any) {
    console.warn(`[Redis] Failed to connect: ${err.message}. Running without Redis cache.`);
  }
}

export async function invalidateArticleCache(slug?: string) {
  try {
    if (redis.status !== 'ready') return;
    const keys = await redis.keys('articles:*');
    if (slug) {
      const slugKey = `article:${slug}`;
      if (!keys.includes(slugKey)) keys.push(slugKey);
    }
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis Cache] Invalidated keys:`, keys);
    }
  } catch (err: any) {
    console.warn(`[Redis Cache] Failed to invalidate cache: ${err.message}`);
  }
}

export async function revokeToken(token: string, expiresInSeconds: number): Promise<void> {
  try {
    if (redis.status !== 'ready') return;
    const ttl = Math.max(expiresInSeconds, 1);
    await redis.set(`token:blocklist:${token}`, 'revoked', 'EX', ttl);
    console.log(`\x1b[35m[Redis Token Revocation]\x1b[0m Token revoked (TTL: ${ttl}s)`);
  } catch (err: any) {
    console.warn(`[Redis Token Revocation] Failed to revoke token: ${err.message}`);
  }
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    if (redis.status !== 'ready') return false;
    const result = await redis.exists(`token:blocklist:${token}`);
    return result === 1;
  } catch (err: any) {
    console.warn(`[Redis Token Revocation] Failed to check token blocklist: ${err.message}`);
    return false;
  }
}
