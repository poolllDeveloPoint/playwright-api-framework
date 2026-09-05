import { test as base } from '@playwright/test';
import { RequestHandler } from './request-handler';
import { APILogger } from './logger';
import { setCustomExpectLogger } from './custom-expect';
import { config } from '../api-test.config';
import { createToken } from '../helpers/createToken';
import { DatabaseHelper } from './db-helper';
import { RedisHelper } from './redis-helper';
import { ensureServerRunning } from './server-check';

type TestOptions = {
    api: RequestHandler;
    config: typeof config;
    db: DatabaseHelper;
    redis: RedisHelper;
};

type WorkerFixture = {
    ensureServer: void;
    authToken: string;
};

export const test = base.extend<TestOptions, WorkerFixture>({
    ensureServer: [ async ({}, use) => {
        await ensureServerRunning();
        await use();
    }, { scope: 'worker', auto: true }],

    authToken: [ async ({ ensureServer }, use) => {
        const authToken = await createToken();
        await use(authToken);
    }, { scope: 'worker' }],

    api: async ({ request, authToken }, use) => {
        const logger = new APILogger();
        setCustomExpectLogger(logger);
        const requestHandler = new RequestHandler(request, config.apiUrl, logger, authToken);
        await use(requestHandler);
    },

    config: async ({}, use) => {
        await use(config);
    },

    db: async ({}, use) => {
        const db = new DatabaseHelper();
        await use(db);
        await db.close();
    },

    redis: async ({}, use) => {
        const redis = new RedisHelper();
        await use(redis);
        await redis.close();
    },
});

export { DatabaseHelper } from './db-helper';
export { RedisHelper } from './redis-helper';