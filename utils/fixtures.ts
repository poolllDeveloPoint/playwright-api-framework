import { test as base } from '@playwright/test';
import { RequestHandler } from './request-handler';
import { Logger } from './logger';

type TextOptions = {
    api: RequestHandler
}

export const test = base.extend<TextOptions>({
    api: async({request}, use) => {
        const baseUrl = 'https://conduit-api.bondaracademy.com/api'
        const logger = new Logger()
        const requestHandler = new RequestHandler(request, baseUrl, logger)
        await use(requestHandler)
    }
})