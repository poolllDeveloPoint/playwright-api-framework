import { Router, Response } from 'express';
import { pool } from '../db';
import { redis, invalidateArticleCache } from '../redis';
import { authRequired, authOptional, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

function formatArticle(row: any) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    tagList: Array.isArray(row.tag_list) ? row.tag_list : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    favorited: Boolean(row.favorited),
    favoritesCount: parseInt(row.favorites_count || '0', 10),
    published: Boolean(row.published),
    author: {
      username: row.author_username || 'imtester',
      bio: row.author_bio || null,
      image: row.author_image || 'https://api.realworld.io/images/smiley-cyrus.jpg',
      following: false,
    },
  };
}

// GET /api/articles (List articles with Redis caching and Draft/Published visibility control)
router.get('/', authOptional, async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);
  const tag = (req.query.tag as string) || 'all';
  const author = (req.query.author as string) || 'all';

  const audience = req.user ? `user:${req.user.id}` : 'public';
  const cacheKey = `articles:list:${audience}:${limit}:${offset}:${tag}:${author}`;
  console.log(`\x1b[36m[Articles List]\x1b[0m Requester: ${req.user ? `Authenticated User (${req.user.username}, id: ${req.user.id})` : 'Public (Unauthenticated)'}`);

  try {
    // 1. Check Redis Cache
    if (redis.status === 'ready') {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`\x1b[32m[Redis Cache HIT]\x1b[0m ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cached));
      }
    }

    // 2. Build Query with Visibility Rules
    // Unauthenticated (public) sees only published articles.
    // Authenticated user sees published articles + their own draft articles.
    const queryParams: any[] = [];
    let whereClause = 'WHERE a.published = true';

    if (req.user) {
      queryParams.push(req.user.id);
      whereClause = `WHERE (a.published = true OR a.author_id = $${queryParams.length})`;
    }

    if (tag && tag !== 'all') {
      queryParams.push(tag);
      whereClause += ` AND $${queryParams.length} = ANY(a.tag_list)`;
    }

    if (author && author !== 'all') {
      queryParams.push(author);
      whereClause += ` AND u.username = $${queryParams.length}`;
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM articles a
      JOIN users u ON a.author_id = u.id
      ${whereClause}
    `;

    queryParams.push(limit);
    const limitParamIdx = queryParams.length;
    queryParams.push(offset);
    const offsetParamIdx = queryParams.length;

    const articlesQuery = `
      SELECT a.*, u.username as author_username, u.bio as author_bio, u.image as author_image
      FROM articles a
      JOIN users u ON a.author_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    const [articlesRes, countRes] = await Promise.all([
      pool.query(articlesQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, queryParams.length - 2)),
    ]);

    const articles = articlesRes.rows.map(formatArticle);
    const articlesCount = parseInt(countRes.rows[0].count, 10);

    const responsePayload = {
      articles,
      articlesCount,
    };

    // 3. Save to Redis Cache (TTL 60s)
    if (redis.status === 'ready') {
      await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 60);
      console.log(`\x1b[33m[Redis Cache MISS]\x1b[0m ${cacheKey} (fetched from DB & cached 60s)`);
    }

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(responsePayload);
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// POST /api/articles (Create article as Draft by default & evict Redis cache)
router.post('/', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const { article } = req.body || {};
  if (!article || !article.title || !article.description || !article.body) {
    return res.status(422).json({
      errors: {
        title: !article?.title ? ["can't be blank"] : undefined,
        description: !article?.description ? ["can't be blank"] : undefined,
        body: !article?.body ? ["can't be blank"] : undefined,
      },
    });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user?.id]);
    const user = userRes.rows[0];

    const baseSlug = slugify(article.title);
    const slug = `${baseSlug}-${Date.now()}`;
    const tagList = Array.isArray(article.tagList) ? article.tagList : [];
    // Default to false (draft) unless explicitly set to true
    const isPublished = Boolean(article.published ?? false);

    const insertQuery = `
      INSERT INTO articles (slug, title, description, body, tag_list, favorited, favorites_count, published, author_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const insertRes = await pool.query(insertQuery, [
      slug,
      article.title,
      article.description,
      article.body,
      tagList,
      false,
      0,
      isPublished,
      user.id,
    ]);

    const createdArticle = insertRes.rows[0];
    createdArticle.author_username = user.username;
    createdArticle.author_bio = user.bio;
    createdArticle.author_image = user.image;

    // Invalidate Redis cache
    await invalidateArticleCache(slug);

    return res.status(201).json({ article: formatArticle(createdArticle) });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// POST /api/articles/:slug/publish (Publish draft article by author)
router.post('/:slug/publish', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const slug = req.params.slug as string;

  try {
    const existing = await pool.query('SELECT * FROM articles WHERE slug = $1', [slug]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ errors: { article: ['not found'] } });
    }

    const current = existing.rows[0];
    if (current.author_id !== req.user?.id) {
      return res.status(403).json({ errors: { article: ['only author can publish this article'] } });
    }

    const updateRes = await pool.query(
      'UPDATE articles SET published = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [current.id]
    );

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [current.author_id]);
    const user = userRes.rows[0];
    const updated = updateRes.rows[0];
    updated.author_username = user.username;
    updated.author_bio = user.bio;
    updated.author_image = user.image;

    // Invalidate Redis cache so the published article appears in public feeds
    await invalidateArticleCache(slug);

    return res.status(200).json({ article: formatArticle(updated) });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// GET /api/articles/:slug (Public sees published only; Author can view their own draft)
router.get('/:slug', authOptional, async (req: AuthenticatedRequest, res: Response) => {
  const slug = req.params.slug as string;
  const cacheKey = `article:${slug}`;

  try {
    const query = `
      SELECT a.*, u.username as author_username, u.bio as author_bio, u.image as author_image
      FROM articles a
      JOIN users u ON a.author_id = u.id
      WHERE a.slug = $1
    `;
    const result = await pool.query(query, [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ errors: { article: ['not found'] } });
    }

    const articleRow = result.rows[0];

    // Visibility check:
    // If not published, only the author can access it!
    if (!articleRow.published) {
      const isAuthor = req.user && req.user.id === articleRow.author_id;
      if (!isAuthor) {
        return res.status(404).json({ errors: { article: ['not found'] } });
      }
    }

    const payload = { article: formatArticle(articleRow) };

    // Only cache published articles in public cache
    if (articleRow.published && redis.status === 'ready') {
      await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60);
      console.log(`\x1b[33m[Redis Cache MISS]\x1b[0m ${cacheKey} (cached 60s)`);
    }

    res.setHeader('X-Cache', articleRow.published ? 'MISS' : 'BYPASS');
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// PUT /api/articles/:slug (Update article & evict cache)
router.put('/:slug', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const slug = req.params.slug as string;
  const { article } = req.body || {};

  try {
    const existing = await pool.query('SELECT * FROM articles WHERE slug = $1', [slug]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ errors: { article: ['not found'] } });
    }

    const current = existing.rows[0];
    if (current.author_id !== req.user?.id) {
      return res.status(403).json({ errors: { article: ['only author can update this article'] } });
    }

    const newTitle = article?.title ?? current.title;
    const newDescription = article?.description ?? current.description;
    const newBody = article?.body ?? current.body;
    const newTagList = article?.tagList ?? current.tag_list;
    const newPublished = typeof article?.published === 'boolean' ? article.published : current.published;
    const newSlug = article?.title ? `${slugify(newTitle)}-${Date.now()}` : current.slug;

    const updateQuery = `
      UPDATE articles
      SET slug = $1, title = $2, description = $3, body = $4, tag_list = $5, published = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    const updateRes = await pool.query(updateQuery, [
      newSlug,
      newTitle,
      newDescription,
      newBody,
      newTagList,
      newPublished,
      current.id,
    ]);

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [current.author_id]);
    const user = userRes.rows[0];
    const updated = updateRes.rows[0];
    updated.author_username = user.username;
    updated.author_bio = user.bio;
    updated.author_image = user.image;

    // Invalidate Redis cache
    await invalidateArticleCache(slug);
    if (newSlug !== slug) {
      await invalidateArticleCache(newSlug);
    }

    return res.status(200).json({ article: formatArticle(updated) });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// DELETE /api/articles/:slug (Delete article & evict cache)
router.delete('/:slug', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const slug = req.params.slug as string;

  try {
    const existing = await pool.query('SELECT * FROM articles WHERE slug = $1', [slug]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ errors: { article: ['not found'] } });
    }

    if (existing.rows[0].author_id !== req.user?.id) {
      return res.status(403).json({ errors: { article: ['only author can delete this article'] } });
    }

    await pool.query('DELETE FROM articles WHERE id = $1', [existing.rows[0].id]);
    await invalidateArticleCache(slug);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

export default router;
