import { createToken } from '../helpers/createToken'
import { expect } from '../utils/custom-expect'
import { test } from '../utils/fixtures'
import articleRequestObject from '../request-object/POST_article.json'

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
    const requestBody = articleRequestObject

    const response = await api
        .path('/articles')
        .headers({Authorization: authorization})
        .body(requestBody)
        .postRequest(201)

    await expect(response).shouldValidateSchema('articles', 'POST_articles')

    const responseArticle = response.article;
    const slug_article = responseArticle.slug

    articleRequestObject.article.title = "Title Edit"
    articleRequestObject.article.description = "about edit"
    articleRequestObject.article.body = "markdown edit"
    articleRequestObject.article.tagList = []

    const requestBodyForEdit = articleRequestObject

    const responseBodyEdited = await api
        .path(`/articles/${slug_article}`)
        .headers({Authorization: authorization})
        .body(requestBodyForEdit)
        .putRequest(200)

    await expect(responseBodyEdited).shouldValidateSchema('articles', 'POST_articles')

    const responseArticleEdited = responseBodyEdited.article;
    const slug_article_edited = responseArticleEdited.slug

    await api
        .path(`/articles/${slug_article_edited}`)
        .headers({Authorization: authorization})
        .deleteRequest(204)
})