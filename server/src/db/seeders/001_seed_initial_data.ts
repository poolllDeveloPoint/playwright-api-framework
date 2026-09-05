import { PoolClient } from 'pg';
import { faker } from '@faker-js/faker';

export const id = '001_seed_initial_data';

export async function seed(client: PoolClient): Promise<void> {
  // 1. Seed Default User
  const userCheck = await client.query('SELECT * FROM users WHERE email = $1', ['imtester@mail.com']);
  let userId: number;

  if (userCheck.rows.length === 0) {
    const userRes = await client.query(
      `INSERT INTO users (username, email, password, bio, image)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['imtester', 'imtester@mail.com', 'imtester123', null, 'https://api.realworld.io/images/smiley-cyrus.jpg']
    );
    userId = userRes.rows[0].id;
  } else {
    userId = userCheck.rows[0].id;
  }

  // 2. Seed Default Tags
  const defaultTags = ['qa', 'playwright', 'automation', 'test', 'redis', 'postgres', 'articlehub'];
  for (const tag of defaultTags) {
    await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tag]);
  }

  // 3. Seed 10 Sample Articles (guaranteeing minimum 10 articles for test suites)
  const countRes = await client.query('SELECT COUNT(*) FROM articles');
  const articleCount = parseInt(countRes.rows[0].count, 10);

  if (articleCount < 10) {
    const needed = 10 - articleCount;
    for (let i = 1; i <= needed; i++) {
      const title = `ArticleHub Automation Guide ${Date.now()}-${i}`;
      const slug = `articlehub-automation-guide-${Date.now()}-${i}`;
      const description = faker.lorem.sentence(8);
      const body = faker.lorem.paragraphs(2);
      const tagList = ['playwright', 'automation', 'articlehub'];

      await client.query(
        `INSERT INTO articles (slug, title, description, body, tag_list, favorited, favorites_count, published, author_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
        [slug, title, description, body, tagList, false, 0, true, userId]
      );
    }
  }
}
