import { expect as baseExpect } from "@playwright/test";
import { APILogger } from "./logger";
import { validateSchema } from "./schema-validator";

let apiLogger: APILogger

export const setCustomExpectLogger = (logger: APILogger) => {
    apiLogger = logger
}

declare global {
    namespace PlaywrightTest {
        interface Matchers<R, T>{
            shouldValidateSchema(dirName: string, fileName: string):Promise<R>
            shouldEqual(expected: T):R
            shouldBeTruthy(): R
        }
    }
}

export const expect = baseExpect.extend({
    async shouldValidateSchema(received: any, dirName: string, fileName: string) {
        let pass: boolean;
        let message: string = '';

        try {
            await validateSchema(dirName, fileName, received)
            pass = true
            message = 'Schema validation pass'
        } catch (error) {
            pass = false
            const logs = apiLogger.getRecentLogs()
            if (error instanceof Error) {
                message = `${error.message}\n\n Recent API Activity: \n ${logs}`
            }
        }

        return {
            message: () => message,
            pass
        }
    },
    shouldEqual(received: any, expected: any) {
        let pass: boolean;
        let logs: string = '';

        try {
            baseExpect(received).toEqual(expected)
            pass = true
            if (this.isNot) {
                logs = apiLogger.getRecentLogs()
            }
        } catch (error) {
            pass = false
            logs = apiLogger.getRecentLogs()   
        }

        const hint = this.isNot ? 'not' : ''
        const message = this.utils.matcherHint('shouldEqual', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint} ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity: \n ${logs}`

        return {
            message: () => message,
            pass
        }
    },
    shouldBeTruthy(received: any) {
        let pass: boolean;
        let logs: string = '';

        try {
            baseExpect(received).toBeTruthy()
            pass = true
            if (this.isNot) {
                logs = apiLogger.getRecentLogs()
            }
        } catch (error) {
            console.log(received, {error})
            pass = false
            logs = apiLogger.getRecentLogs()   
        }

        const hint = this.isNot ? 'not' : ''
        const message = this.utils.matcherHint('shouldBeTruthy', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint} to be truthy\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity: \n ${logs}`

        return {
            message: () => message,
            pass
        }
    },
})