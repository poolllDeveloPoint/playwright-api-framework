import { RequestHandler } from "../utils/request-handler";


export async function createToken(api: RequestHandler, usermail: string, password: string ) {
    const requestBody = {
        "email": usermail,
        "password": password,
    }
    const responseBody = await api
        .path('/users/login')
        .body({user: requestBody})
        .postRequest(200)

    const userData = responseBody.user;
    const user_token = userData.token

    return `Token ${user_token}`
}