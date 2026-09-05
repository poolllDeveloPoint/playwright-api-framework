import { createToken } from '../../helpers/createToken'
import { expect } from '../../utils/custom-expect'
import { test } from '../../utils/fixtures'
import articleRequestObject from '../../request-object/POST_article.json'
import { getNewArticle } from '../../helpers/generateArticle'
import { faker } from '@faker-js/faker'

let authorization: string
test('get all articles', async({ api }) => {
    const limit = 10
    const responseData = await api
        .path('/articles')
        .params({limit, offset:0})
        .getRequest(200)

    await expect(responseData).shouldValidateSchema('articles', 'GET_articles')
    
    const articles_count = responseData.articlesCount
    expect(articles_count).shouldEqual(limit)
})

test('get all articles without login', async({ api }) => {
    const limit = 10
    const responseData = await api
        .path('/articles')
        .params({limit, offset:0})
        .clearAuth()
        .getRequest(200)

    await expect(responseData).shouldValidateSchema('articles', 'GET_articles')
    
    const articles_count = responseData.articlesCount
    expect(articles_count).shouldEqual(limit)
})

test('get all tags', async({ api }) => {
    const response = await api
        .path('/tags')
        .getRequest(200)
    expect(response).shouldValidateSchema('tags', 'GET_tags')
})

test.beforeAll('login user', async () => {
    authorization = await createToken()
})

test('create article and delete', async({ api }) => {
    const requestBody = articleRequestObject

    const response = await api
        .path('/articles')
        .headers({Authorization: authorization})
        .body(requestBody)
        .postRequest(201)

    await expect(response).shouldValidateSchema('articles', 'POST_articles')

    const responseArticle = response.article;
    const slug = responseArticle.slug

    await api
        .path(`/articles/${slug}`)
        .headers({Authorization: authorization})
        .deleteRequest(204)
})

test('create, update and delete article', async({ api }) => {
    const newArticle = getNewArticle();

    const response = await api
        .path('/articles')
        .headers({Authorization: authorization})
        .body(newArticle)
        .postRequest(201)

    await expect(response).shouldValidateSchema('articles', 'POST_articles')
    expect(response.article.title).shouldEqual(newArticle.article.title)

    const responseArticle = response.article;
    const slug_article = responseArticle.slug

    const newArticleForEdit = getNewArticle();

    const responseBodyEdited = await api
        .path(`/articles/${slug_article}`)
        .headers({Authorization: authorization})
        .body(newArticleForEdit)
        .putRequest(200)

    await expect(responseBodyEdited).shouldValidateSchema('articles', 'POST_articles')

    const responseArticleEdited = responseBodyEdited.article;
    const slug_article_edited = responseArticleEdited.slug

    await api
        .path(`/articles/${slug_article_edited}`)
        .headers({Authorization: authorization})
        .deleteRequest(204)
})

test('REQ-USR-01: register a new user successfully', async ({ api }) => {
    // Keep username between 3 and 20 chars (REQ-USR-02) and eliminate collision
    const cleanName = faker.internet.username().replace(/[^a-zA-Z0-9]/g, '').slice(0, 14);
    const uniqueUsername = `${cleanName}_${faker.string.alphanumeric(4)}`;
    const uniqueEmail = faker.internet.email();
    const password = faker.internet.password({ length: 12 });

    const res = await api
        .path('/users')
        .clearAuth()
        .body({
            user: {
                username: uniqueUsername,
                email: uniqueEmail,
                password: password
            }
        })
        .postRequest(201);

    expect(res.user).shouldBeDefined();
    expect(res.user.username).shouldEqual(uniqueUsername);
    expect(res.user.email).shouldEqual(uniqueEmail);
    expect(res.user.token).shouldBeDefined();
});

test('REQ-ART-01: filter articles by tag', async ({ api }) => {
    const targetTag = 'playwright';
    const res = await api
        .path('/articles')
        .params({ tag: targetTag, limit: 10, offset: 0 })
        .clearAuth()
        .getRequest(200);

    expect(res.articles).shouldBeDefined();
    expect(res.articles.length).shouldBeGreaterThan(0);
    for (const article of res.articles) {
        expect(article.tagList).shouldContain(targetTag);
    }
});

test('REQ-ART-01: filter articles by author', async ({ api }) => {
    const targetAuthor = 'imtester';
    const res = await api
        .path('/articles')
        .params({ author: targetAuthor, limit: 10, offset: 0 })
        .clearAuth()
        .getRequest(200);

    expect(res.articles).shouldBeDefined();
    expect(res.articles.length).shouldBeGreaterThan(0);
    for (const article of res.articles) {
        expect(article.author.username).shouldEqual(targetAuthor);
    }
});