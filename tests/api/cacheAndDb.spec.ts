import { test } from '../../utils/fixtures';
import { expect } from '../../utils/custom-expect';
import { faker } from '@faker-js/faker';

test.describe('ArticleHub Enterprise Integration: DB Assertion, Redis Caching, & Token Revocation', () => {

    test('REQ-CACHE-01 & REQ-CACHE-02: verify Redis Cache MISS, HIT, and eviction on mutation', async ({ api, redis }) => {
        // 1. Ensure clean cache state
        await redis.flushArticles();
        const initialHasCache = await redis.hasArticleListCache();
        expect(initialHasCache).shouldBeFalse();

        // 2. Request 1 (Cold Request -> Expect Cache MISS from PostgreSQL)
        const coldResponse = await api
            .path('/articles')
            .params({ limit: 10, offset: 0 })
            .clearAuth()
            .getResponseWithHeaders(200);

        expect(coldResponse.headers['x-cache']).shouldEqual('MISS');
        expect(coldResponse.body.articles.length).shouldBeGreaterThan(0);

        // Verify key is now stored in Redis
        const cacheStored = await redis.hasArticleListCache();
        expect(cacheStored).shouldBeTrue();

        // 3. Request 2 (Warm Request -> Expect Cache HIT directly from Redis)
        const warmResponse = await api
            .path('/articles')
            .params({ limit: 10, offset: 0 })
            .clearAuth()
            .getResponseWithHeaders(200);

        expect(warmResponse.headers['x-cache']).shouldEqual('HIT');
        expect(warmResponse.body.articlesCount).shouldEqual(coldResponse.body.articlesCount);

        // 4. Trigger Mutation (POST /api/articles) -> Expect Redis Cache Eviction
        const newTitle = `Cache Test Mutation ${Date.now()}`;
        const createRes = await api
            .path('/articles')
            .body({
                article: {
                    title: newTitle,
                    description: 'Testing cache eviction behavior',
                    body: 'Content for cache test',
                    tagList: ['cache', 'redis'],
                    published: true
                }
            })
            .postRequest(201);

        const createdSlug = createRes.article.slug;
        expect(createdSlug).shouldBeDefined();
        expect(createRes.article.tagList).shouldContain('cache');

        // 5. Assert Redis article list cache was evicted automatically
        const cacheAfterMutation = await redis.hasArticleListCache();
        expect(cacheAfterMutation).shouldBeFalse();

        // 6. Request 3 (Subsequent Request -> Expect fresh Cache MISS from PostgreSQL)
        const freshResponse = await api
            .path('/articles')
            .params({ limit: 10, offset: 0 })
            .clearAuth()
            .getResponseWithHeaders(200);

        expect(freshResponse.headers['x-cache']).shouldEqual('MISS');

        // Cleanup: Delete test article
        await api.path(`/articles/${createdSlug}`).deleteRequest(204);
    });

    test('REQ-DB-01: verify direct PostgreSQL persistence and relational foreign-key integrity', async ({ api, db }) => {
        const uniqueTitle = `Direct DB Assertion ${Date.now()}`;
        const uniqueDesc = faker.lorem.sentence(6);
        const uniqueBody = faker.lorem.paragraphs(1);

        // 1. Create Article via API
        const createRes = await api
            .path('/articles')
            .body({
                article: {
                    title: uniqueTitle,
                    description: uniqueDesc,
                    body: uniqueBody,
                    tagList: ['database', 'assertion'],
                    published: true
                }
            })
            .postRequest(201);

        const slug = createRes.article.slug;
        expect(slug).shouldBeDefined();
        expect(createRes.article.tagList).shouldContain('database');

        // 2. Direct PostgreSQL Assertion: Verify data exists with identical field values
        const dbArticle = await db.getArticleBySlug(slug);
        expect(dbArticle).shouldNotBeNull();
        expect(dbArticle?.title).shouldEqual(uniqueTitle);
        expect(dbArticle?.description).shouldEqual(uniqueDesc);
        expect(dbArticle?.body).shouldEqual(uniqueBody);
        expect(dbArticle?.published).shouldBeTrue();
        expect(dbArticle?.author_id).shouldBeGreaterThan(0);

        // Direct DB Assertion: Verify foreign key author exists in users table
        const dbUser = await db.getUserByEmail('imtester@mail.com');
        expect(dbUser).shouldNotBeNull();
        expect(dbArticle?.author_id).shouldEqual(dbUser?.id);

        // 3. Delete Article via API
        await api.path(`/articles/${slug}`).deleteRequest(204);

        // 4. Direct PostgreSQL Assertion: Verify record is permanently purged from DB
        const isDeleted = await db.isArticleDeleted(slug);
        expect(isDeleted).shouldBeTrue();
    });

    test('REQ-ART-05: verify article draft isolation and publication workflow', async ({ api, db }) => {
        const draftTitle = `Draft Lifecycle Article ${Date.now()}`;

        // 1. Create Draft Article (default published: false)
        const createRes = await api
            .path('/articles')
            .body({
                article: {
                    title: draftTitle,
                    description: 'Draft isolation test',
                    body: 'Content for draft test'
                }
            })
            .postRequest(201);

        const slug = createRes.article.slug;
        expect(createRes.article.published).shouldBeFalse();

        // Verify DB persistence confirms draft state
        const dbDraft = await db.getArticleBySlug(slug);
        expect(dbDraft?.published).shouldBeFalse();

        // 2. Unauthenticated Public Check -> Draft must NOT be accessible (404)
        await api
            .path(`/articles/${slug}`)
            .clearAuth()
            .getRequest(404);

        // Unauthenticated Feed Check -> Draft must NOT appear in public feed
        const publicFeed = await api
            .path('/articles')
            .params({ limit: 50, offset: 0 })
            .clearAuth()
            .getRequest(200);

        const foundInPublicFeed = publicFeed.articles.some((a: any) => a.slug === slug);
        expect(foundInPublicFeed).shouldBeFalse();

        // 3. Authenticated Author Check -> Author can view their own draft
        const authorView = await api
            .path(`/articles/${slug}`)
            .getRequest(200);

        expect(authorView.article.slug).shouldEqual(slug);
        expect(authorView.article.published).shouldBeFalse();

        // 4. Author Publishes the Article (POST /api/articles/:slug/publish)
        const publishRes = await api
            .path(`/articles/${slug}/publish`)
            .postRequest(200);

        expect(publishRes.article.published).shouldBeTrue();

        // Verify DB confirms status update
        const dbPublished = await db.getArticleBySlug(slug);
        expect(dbPublished?.published).shouldBeTrue();

        // 5. Unauthenticated Public Check -> Now visible to public!
        const publicAfterPublish = await api
            .path(`/articles/${slug}`)
            .clearAuth()
            .getRequest(200);

        expect(publicAfterPublish.article.published).shouldBeTrue();

        // Cleanup: Delete article
        await api.path(`/articles/${slug}`).deleteRequest(204);
    });

    test('REQ-AUTH-03: verify user logout and server-side token revocation in Redis blocklist', async ({ api, redis, config }) => {
        // 1. Login to obtain an active session token
        const loginRes = await api
            .path('/users/login')
            .body({
                user: {
                    email: config.usermail,
                    password: config.password
                }
            })
            .postRequest(200);

        const token = loginRes.user.token;
        expect(token).shouldBeDefined();

        // 2. Verify token is functional prior to logout
        const profileCall = await api
            .path('/articles')
            .params({ limit: 1 })
            .headers({ Authorization: `Token ${token}` })
            .getRequest(200);

        expect(profileCall.articles).shouldBeDefined();

        // 3. Perform Logout (POST /api/users/logout)
        const logoutRes = await api
            .path('/users/logout')
            .headers({ Authorization: `Token ${token}` })
            .postRequest(200);

        expect(logoutRes.message).shouldEqual('Successfully logged out');

        // 4. Verify Redis Blocklist: Token must be recorded in token:blocklist:*
        const isBlocklisted = await redis.isTokenInBlocklist(token);
        expect(isBlocklisted).shouldBeTrue();

        // 5. Verify Token Rejection: Subsequent calls with revoked token must fail with 401
        await api
            .path('/articles')
            .headers({ Authorization: `Token ${token}` })
            .body({
                article: {
                    title: 'Unauthorized Post Attempt',
                    description: 'Should fail',
                    body: 'Should fail'
                }
            })
            .postRequest(401);

        // 6. Verify Re-logout Rejection: Cannot logout twice with the same revoked token
        await api
            .path('/users/logout')
            .headers({ Authorization: `Token ${token}` })
            .postRequest(401);
    });
});
