import { test as base } from '@playwright/test';
import { RequestHandler } from './request-handler';
import { APILogger } from './logger';
import { setCustomExpectLogger } from './custom-expect';
import { config } from '../api-test.config';
import { createToken } from '../helpers/createToken';

type TextOptions = {
    api: RequestHandler,
    config: typeof config,
}

type WorkerFixture = {
    authToken: string
}

export const test = base.extend<TextOptions, WorkerFixture>({
    authToken: [ async ({}, use) => {
        const authToken = await createToken()
        await use(authToken)
    }, {scope: 'worker'}],

    api: async({request, authToken}, use) => {
        const logger = new APILogger()
        setCustomExpectLogger(logger)
        const requestHandler = new RequestHandler(request, config.apiUrl, logger, authToken)
        await use(requestHandler)
    },
    config: async ({}, use) => {
        await use(config)
    }
})