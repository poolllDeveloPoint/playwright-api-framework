import { Pool } from 'pg';
import { config } from '../api-test.config';

export interface DbArticle {
    id: number;
    slug: string;
    title: string;
    description: string;
    body: string;
    tag_list: string[];
    favorited: boolean;
    favorites_count: number;
    published: boolean;
    author_id: number;
    created_at: Date;
    updated_at: Date;
}

export interface DbUser {
    id: number;
    username: string;
    email: string;
    bio: string | null;
    image: string | null;
}

export class DatabaseHelper {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            max: 5,
            idleTimeoutMillis: 10000,
        });
    }

    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const res = await this.pool.query(sql, params);
        return res.rows;
    }

    async getArticleBySlug(slug: string): Promise<DbArticle | null> {
        const rows = await this.query<DbArticle>('SELECT * FROM articles WHERE slug = $1', [slug]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getUserByEmail(email: string): Promise<DbUser | null> {
        const rows = await this.query<DbUser>(
            'SELECT id, username, email, bio, image FROM users WHERE email = $1',
            [email]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    async getUserByUsername(username: string): Promise<DbUser | null> {
        const rows = await this.query<DbUser>(
            'SELECT id, username, email, bio, image FROM users WHERE username = $1',
            [username]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    async isArticleDeleted(slug: string): Promise<boolean> {
        const article = await this.getArticleBySlug(slug);
        return article === null;
    }

    async getArticleCount(): Promise<number> {
        const rows = await this.query<{ count: string }>('SELECT COUNT(*) as count FROM articles');
        return parseInt(rows[0].count, 10);
    }

    async getPublishedArticleCount(): Promise<number> {
        const rows = await this.query<{ count: string }>('SELECT COUNT(*) as count FROM articles WHERE published = true');
        return parseInt(rows[0].count, 10);
    }

    async deleteArticleBySlug(slug: string): Promise<void> {
        await this.query('DELETE FROM articles WHERE slug = $1', [slug]);
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
