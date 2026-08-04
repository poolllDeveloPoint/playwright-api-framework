import {expect} from '@playwright/test'
import { test } from '../utils/fixtures'

let token: string
test('get all articles', async({ api }) => {
    const limit = 10
    const responseData = await api
        .path('/articles')
        .params({limit, offset:0})
        .getRequest(200)

    expect(responseData).toHaveProperty('articles')
    expect(responseData).toHaveProperty('articlesCount')
    
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