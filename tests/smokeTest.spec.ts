import { expect } from '../utils/custom-expect'
import { test } from '../utils/fixtures'

let token: string
test('get all articles', async({ api }) => {
    const limit = 10
    const responseData = await api
        .path('/articles')
        .params({limit, offset:0})
        .getRequest(200)

    expect(responseData).shouldHaveProperty('articles')
    expect(responseData).shouldHaveProperty('articlesCount')
    
    const articles_count = responseData.articlesCount
    expect(articles_count).toEqual(limit)
})

test('get all tags', async({ request }) => {
    const response = await request.get('https://conduit-api.bondaracademy.com/api/tags')
    const responseData = await response.json()

    expect(responseData).toHaveProperty('tags')
})

test.beforeAll('login user', async ({ request }) => {
    const requestBody = {
        "email": "imtester@mail.com",
        "password": "imtester123"
    }
    const response = await request.post('https://conduit-api.bondaracademy.com/api/users/login', {
        data: {user: requestBody}
    })

    const response_status = await response.status();
    expect(response_status).toEqual(200)

    const responseBody = await response.json();

    expect(responseBody).toHaveProperty('user')
    const userData = responseBody.user;
    expect(userData).toHaveProperty('email')
    expect(userData).toHaveProperty('username')
    const user_email = userData.email
    const username = userData.username
    const user_token = userData.token
    expect(user_email).toEqual(requestBody.email)
    expect(username).toEqual('imtester')
    expect(user_token).toBeTruthy()
    token = user_token
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
        .headers({Authorization: `Token ${token}`})
        .body(requestBody)
        .postRequest(201)

    expect(response).toHaveProperty('article');

    const responseArticle = response.article;
    expect(responseArticle).toHaveProperty('title')
    expect(responseArticle).toHaveProperty('description')
    expect(responseArticle).toHaveProperty('body')
    expect(responseArticle).toHaveProperty('slug')

    const response_title = responseArticle.title
    expect(response_title).toEqual(requestBody.article.title)
    const response_description = responseArticle.description
    expect(response_description).toEqual(requestBody.article.description)
    const response_body = responseArticle.body
    expect(response_body).toEqual(requestBody.article.body)
    const slug = responseArticle.slug

    await api
        .path(`/articles/${slug}`)
        .headers({Authorization: `Token ${token}`})
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
        .headers({Authorization: `Token ${token}`})
        .body(requestBody)
        .postRequest(201)

    expect(response).toHaveProperty('article');

    const responseArticle = response.article;
    expect(responseArticle).toHaveProperty('title')
    expect(responseArticle).toHaveProperty('description')
    expect(responseArticle).toHaveProperty('body')
    expect(responseArticle).toHaveProperty('slug')

    const response_title = responseArticle.title
    expect(response_title).toEqual(requestBody.article.title)
    const response_description = responseArticle.description
    expect(response_description).toEqual(requestBody.article.description)
    const response_body = responseArticle.body
    expect(response_body).toEqual(requestBody.article.body)
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
        .headers({Authorization: `Token ${token}`})
        .body(requestBodyForEdit)
        .putRequest(200)

    expect(responseBodyEdited).toHaveProperty('article');

    const responseArticleEdited = responseBodyEdited.article;
    expect(responseArticleEdited).toHaveProperty('title')
    expect(responseArticleEdited).toHaveProperty('description')
    expect(responseArticleEdited).toHaveProperty('body')
    expect(responseArticleEdited).toHaveProperty('slug')

    const response_title_edited = responseArticleEdited.title
    expect(response_title_edited).toEqual(responseBodyEdited.article.title)
    const response_description_edited = responseArticleEdited.description
    expect(response_description_edited).toEqual(responseBodyEdited.article.description)
    const response_body_edited = responseArticleEdited.body
    expect(response_body_edited).toEqual(responseBodyEdited.article.body)
    const slug_article_edited = responseArticleEdited.slug

    await api
        .path(`/articles/${slug_article_edited}`)
        .headers({Authorization: `Token ${token}`})
        .deleteRequest(204)
})