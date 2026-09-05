import { expect as baseExpect } from "@playwright/test";
import { APILogger } from "./logger";
import { validateSchema } from "./schema-validator";

let apiLogger: APILogger | undefined;

export const setCustomExpectLogger = (logger: APILogger) => {
    apiLogger = logger;
};

function getFormattedLogs(): string {
    if (!apiLogger) return 'No recent API activity logged.';
    const logs = apiLogger.getRecentLogs();
    return logs && logs.trim().length > 0 ? logs : 'No recent API activity logged.';
}

declare global {
    namespace PlaywrightTest {
        interface Matchers<R, T> {
            shouldValidateSchema(dirName: string, fileName: string): Promise<R>;
            shouldEqual(expected: any): R;
            shouldBeTruthy(): R;
            shouldBeTrue(): R;
            shouldBeFalse(): R;
            shouldBeDefined(): R;
            shouldNotBeNull(): R;
            shouldBeNull(): R;
            shouldBeGreaterThan(expected: number): R;
            shouldBeGreaterThanOrEqual(expected: number): R;
            shouldContain(expected: any): R;
        }
    }
}

export const expect = baseExpect.extend({
    async shouldValidateSchema(received: any, dirName: string, fileName: string) {
        let pass: boolean;
        let message: string = '';

        try {
            await validateSchema(dirName, fileName, received);
            pass = true;
            message = 'Schema validation pass';
        } catch (error) {
            pass = false;
            const logs = getFormattedLogs();
            if (error instanceof Error) {
                message = `${error.message}\n\nRecent API Activity:\n${logs}`;
            }
        }

        return {
            message: () => message,
            pass,
        };
    },

    shouldEqual(received: any, expected: any) {
        let pass: boolean;

        try {
            baseExpect(received).toEqual(expected);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldEqual', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeTruthy(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).toBeTruthy();
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeTruthy', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}to be truthy\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeTrue(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).toBe(true);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeTrue', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}true\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeFalse(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).toBe(false);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeFalse', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}false\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeDefined(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).toBeDefined();
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeDefined', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}defined\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldNotBeNull(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).not.toBeNull();
            pass = true;
        } catch {
            pass = false;
        }

        const message = () =>
            this.utils.matcherHint('shouldNotBeNull', undefined, undefined) +
            '\n\n' +
            `Expected: not null\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeNull(received: any) {
        let pass: boolean;

        try {
            baseExpect(received).toBeNull();
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeNull', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}null\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeGreaterThan(received: any, expected: number) {
        let pass: boolean;

        try {
            baseExpect(received).toBeGreaterThan(expected);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeGreaterThan', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}> ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldBeGreaterThanOrEqual(received: any, expected: number) {
        let pass: boolean;

        try {
            baseExpect(received).toBeGreaterThanOrEqual(expected);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldBeGreaterThanOrEqual', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}>= ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },

    shouldContain(received: any, expected: any) {
        let pass: boolean;

        try {
            baseExpect(received).toContain(expected);
            pass = true;
        } catch {
            pass = false;
        }

        const hint = this.isNot ? 'not ' : '';
        const message = () =>
            this.utils.matcherHint('shouldContain', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected: ${hint}to contain ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API Activity:\n${getFormattedLogs()}`;

        return {
            message,
            pass,
        };
    },
});