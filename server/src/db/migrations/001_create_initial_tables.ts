import { PoolClient } from 'pg';

export const id = '001_create_initial_tables';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      bio TEXT DEFAULT NULL,
      image VARCHAR(512) DEFAULT 'https://api.realworld.io/images/smiley-cyrus.jpg',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      body TEXT NOT NULL,
      tag_list TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      favorited BOOLEAN DEFAULT FALSE,
      favorites_count INT DEFAULT 0,
      published BOOLEAN DEFAULT FALSE,
      author_id INT REFERENCES users(id) ON DELETE CASCADE
    );

    -- Ensure published column exists if table already created previously
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS articles CASCADE;
    DROP TABLE IF EXISTS tags CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
}
