import { config } from "../api-test.config";
import { APILogger } from "../utils/logger";
import { RequestHandler } from "../utils/request-handler";
import { request } from "@playwright/test";

export async function createToken() {
    const context = await request.newContext()
    const logger = new APILogger()
    const api = new RequestHandler(context, config.apiUrl, logger)
    const requestBody = {
        "email": config.usermail,
        "password": config.password,
    }
    const responseBody = await api
        .path('/users/login')
        .body({user: requestBody})
        .postRequest(200)

    const userData = responseBody.user;
    const user_token = userData.token

    return `Token ${user_token}`
}