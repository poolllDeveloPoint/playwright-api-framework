import Redis from 'ioredis';
import { config } from '../api-test.config';

export class RedisHelper {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            lazyConnect: true,
            retryStrategy(times) {
                if (times > 3) return null;
                return 500;
            },
        });
    }

    private async ensureConnected(): Promise<void> {
        if (this.client.status !== 'ready' && this.client.status !== 'connecting') {
            await this.client.connect();
        }
    }

    async get(key: string): Promise<string | null> {
        await this.ensureConnected();
        return this.client.get(key);
    }

    async getJson<T = any>(key: string): Promise<T | null> {
        const val = await this.get(key);
        return val ? JSON.parse(val) : null;
    }

    async hasKey(key: string): Promise<boolean> {
        await this.ensureConnected();
        const exists = await this.client.exists(key);
        return exists === 1;
    }

    async getKeys(pattern: string): Promise<string[]> {
        await this.ensureConnected();
        return this.client.keys(pattern);
    }

    async hasArticleListCache(): Promise<boolean> {
        const keys = await this.getKeys('articles:list:*');
        return keys.length > 0;
    }

    async isTokenInBlocklist(token: string): Promise<boolean> {
        const cleanToken = token.replace(/^(Token|Bearer)\s+/i, '').trim();
        return this.hasKey(`token:blocklist:${cleanToken}`);
    }

    async flushAll(): Promise<void> {
        await this.ensureConnected();
        await this.client.flushall();
    }

    async flushArticles(): Promise<void> {
        await this.ensureConnected();
        const keys = await this.getKeys('articles:*');
        const singleKeys = await this.getKeys('article:*');
        const all = [...keys, ...singleKeys];
        if (all.length > 0) {
            await this.client.del(...all);
        }
    }

    async getTtl(key: string): Promise<number> {
        await this.ensureConnected();
        return this.client.ttl(key);
    }

    async close(): Promise<void> {
        if (this.client.status === 'ready' || this.client.status === 'connecting') {
            await this.client.quit();
        }
    }
}
