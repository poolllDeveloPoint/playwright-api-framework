import { test as base } from '@playwright/test';
import { RequestHandler } from './request-handler';

type TextOptions = {
    api: RequestHandler
}

export const test = base.extend<TextOptions>({
    api: async({request}, use) => {
        const baseUrl = 'https://conduit-api.bondaracademy.com/api'
        const requestHandler = new RequestHandler(request, baseUrl)
        await use(requestHandler)
    }
})