import { expect } from '../../utils/custom-expect'
import {test} from '../../utils/fixtures'

[
    {"username": "im", "usernameErrorMessage": "is too short (minimum is 3 characters)"},
    {"username": "imb", "usernameErrorMessage": "-"},
    {"username": "imtesterwithlengthus", "usernameErrorMessage": "-"},
    {"username": "imtesterwithlengthusername", "usernameErrorMessage": "is too long (maximum is 20 characters)"},
].forEach(({username, usernameErrorMessage}) => {
    test(`Got message: ${usernameErrorMessage} for register with username: ${username}`, async ({api}) => {
        const newUserResponse = await api
            .path('/users')
            .body({user: {username}})
            .clearAuth()
            .postRequest(422)
        
        if (username.length === 3 || username.length === 20) {
            expect(newUserResponse.errors).not.toHaveProperty('username')
        } else {
            expect(newUserResponse.errors.username[0]).shouldEqual(usernameErrorMessage)
        }
    })
})

test('REQ-AUTH-01: fail login with incorrect password', async ({ api, config }) => {
    const res = await api
        .path('/users/login')
        .clearAuth()
        .body({
            user: {
                email: config.usermail,
                password: 'WrongPassword123!'
            }
        })
        .postRequest(401);

    expect(res.errors['email or password'][0]).shouldEqual('is invalid');
});

test('REQ-USR-01: prevent duplicate user registration with existing email', async ({ api, config }) => {
    const res = await api
        .path('/users')
        .clearAuth()
        .body({
            user: {
                username: `dup_${Date.now()}`,
                email: config.usermail,
                password: 'Password123!'
            }
        })
        .postRequest(422);

    expect(res.errors.username[0]).shouldEqual('has already been taken');
});

test('REQ-AUTH-02: reject article creation without Authorization header', async ({ api }) => {
    const res = await api
        .path('/articles')
        .clearAuth()
        .body({
            article: {
                title: 'Unauthorized Article',
                description: 'Testing 401',
                body: 'Testing 401'
            }
        })
        .postRequest(401);

    expect(res.errors.authorization[0]).shouldEqual("can't be blank");
});

test('REQ-ART-04: return 404 when deleting a non-existent article slug', async ({ api }) => {
    const res = await api
        .path('/articles/non-existent-slug-xyz123456789')
        .deleteRequest(404);

    expect(res.errors.article[0]).shouldEqual('not found');
});

