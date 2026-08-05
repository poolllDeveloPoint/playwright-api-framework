import { expect as baseExpect } from "@playwright/test";
import { APILogger } from "./logger";

let apiLogger: APILogger

export const setCustomExpectLogger = (logger: APILogger) => {
    apiLogger = logger
}

declare global {
    namespace PlaywrightTest {
        interface Matchers<R, T>{
            shouldHaveProperty(expected: T):R
        }
    }
}

export const expect = baseExpect.extend({
    shouldHaveProperty(received: any, expected: any) {
        let pass: boolean;
        let logs: string = '';

        try {
            baseExpect(received).toHaveProperty(expected)
            pass = true
            if (this.isNot) {
                logs = apiLogger.getRecentLogs()
            }
        } catch (error) {
            pass = false
            logs = apiLogger.getRecentLogs()   
        }

        const hint = this.isNot ? 'not' : ''
        const message = this.utils.matcherHint('shouldHaveProperty', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint} ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity: \n ${logs}`

        return {
            message: () => message,
            pass
        }
    }
})