import { expect } from '../utils/custom-expect'
import {test} from '../utils/fixtures'

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
