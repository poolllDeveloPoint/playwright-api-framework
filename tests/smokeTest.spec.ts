import { createToken } from '../helpers/createToken'
import { expect } from '../utils/custom-expect'
import { test } from '../utils/fixtures'
import { validateSchema } from '../utils/schema-validator'

let authorization: string
test('get all articles', async({ api }) => {
    const limit = 10
    const responseData = await api
        .path('/articles')
        .params({limit, offset:0})
        .getRequest(200)

    expect(responseData).shouldHaveProperty('articles')
    expect(responseData).shouldHaveProperty('articlesCount')
    
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

    expect(responseData).shouldHaveProperty('articles')
    expect(responseData).shouldHaveProperty('articlesCount')
    
    const articles_count = responseData.articlesCount
    expect(articles_count).shouldEqual(limit)
})

test('get all tags', async({ api }) => {
    const response = await api
        .path('/tags')
        .getRequest(200)
    expect(response).shouldValidateSchema('tags', 'GET_tags')
    expect(response).shouldHaveProperty('tags')
})

test.beforeAll('login user', async () => {
    authorization = await createToken()
})

test('create article and delete', async({ api }) => {
    const requestBody = {
        "article": {
            "title": "Title",
            "description": "about",
            "body": "markdown",
            "tagList": []
        }
    }

    const response = await api
        .path('/articles')
        .headers({Authorization: authorization})
        .body(requestBody)
        .postRequest(201)

    expect(response).shouldHaveProperty('article');

    const responseArticle = response.article;
    expect(responseArticle).shouldHaveProperty('title')
    expect(responseArticle).shouldHaveProperty('description')
    expect(responseArticle).shouldHaveProperty('body')
    expect(responseArticle).shouldHaveProperty('slug')

    const response_title = responseArticle.title
    expect(response_title).shouldEqual(requestBody.article.title)
    const response_description = responseArticle.description
    expect(response_description).shouldEqual(requestBody.article.description)
    const response_body = responseArticle.body
    expect(response_body).shouldEqual(requestBody.article.body)
    const slug = responseArticle.slug

    await api
        .path(`/articles/${slug}`)
        .headers({Authorization: authorization})
        .deleteRequest(204)
})

test('create, update and delete article', async({ api }) => {
    const requestBody = {
        "article": {
            "title": "Title",
            "description": "about",
            "body": "markdown",
            "tagList": []
        }
    }

    const response = await api
        .path('/articles')
        .headers({Authorization: authorization})
        .body(requestBody)
        .postRequest(201)

    expect(response).shouldHaveProperty('article');

    const responseArticle = response.article;
    expect(responseArticle).shouldHaveProperty('title')
    expect(responseArticle).shouldHaveProperty('description')
    expect(responseArticle).shouldHaveProperty('body')
    expect(responseArticle).shouldHaveProperty('slug')

    const response_title = responseArticle.title
    expect(response_title).shouldEqual(requestBody.article.title)
    const response_description = responseArticle.description
    expect(response_description).shouldEqual(requestBody.article.description)
    const response_body = responseArticle.body
    expect(response_body).shouldEqual(requestBody.article.body)
    const slug_article = responseArticle.slug

    const requestBodyForEdit = {
        "article": {
            "title": "Title Edit",
            "description": "about edit",
            "body": "markdown edit",
            "tagList": []
        }
    }

    const responseBodyEdited = await api
        .path(`/articles/${slug_article}`)
        .headers({Authorization: authorization})
        .body(requestBodyForEdit)
        .putRequest(200)

    expect(responseBodyEdited).shouldHaveProperty('article');

    const responseArticleEdited = responseBodyEdited.article;
    expect(responseArticleEdited).shouldHaveProperty('title')
    expect(responseArticleEdited).shouldHaveProperty('description')
    expect(responseArticleEdited).shouldHaveProperty('body')
    expect(responseArticleEdited).shouldHaveProperty('slug')

    const response_title_edited = responseArticleEdited.title
    expect(response_title_edited).shouldEqual(responseBodyEdited.article.title)
    const response_description_edited = responseArticleEdited.description
    expect(response_description_edited).shouldEqual(responseBodyEdited.article.description)
    const response_body_edited = responseArticleEdited.body
    expect(response_body_edited).shouldEqual(responseBodyEdited.article.body)
    const slug_article_edited = responseArticleEdited.slug

    await api
        .path(`/articles/${slug_article_edited}`)
        .headers({Authorization: authorization})
        .deleteRequest(204)
})