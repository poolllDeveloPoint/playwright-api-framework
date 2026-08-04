import { APIRequestContext, expect } from "@playwright/test"
import { Logger } from "./logger"

export class RequestHandler {
    private request: APIRequestContext
    private defaultBaseUrl: string
    private baseUrl?: string
    private apiPath: string = ''
    private apiParams: object = {}
    private apiHeaders: Record<string, string> = {}
    private apiBody: object = {}
    private logger: Logger

    constructor(request: APIRequestContext, apiBaseUrl: string, logger: Logger) {
        this.request = request
        this.defaultBaseUrl = apiBaseUrl
        this.logger = logger
    }

    url (url: string) {
        this.baseUrl = url
        return this
    }

    path (path: string) {
        this.apiPath = path
        return this
    }

    params (params: object) {
        this.apiParams = params
        return this
    }

    headers (headers: Record<string, string>) {
        this.apiHeaders = headers
        return this
    }

    body (body: object) {
        this.apiBody = body
        return this
    }

    private getUrl() {
        const url = new URL(`${this.baseUrl ?? this.defaultBaseUrl}${this.apiPath}`)
        for (const [key, value] of Object.entries(this.apiParams)) {
            url.searchParams.append(key, value)
        }
        return url.toString()
    }

    async getRequest (status_code: number) {
        const url = this.getUrl()
        this.logger.logRequest('GET', url, {headers: this.apiHeaders})
        const response = await this.request.get(url, {
            headers: this.apiHeaders,
        })

        const respone_status_code = await response.status()
        const response_json = await response.json()
        this.logger.logResponse(respone_status_code, response_json)
        this.statusCodeValidator(respone_status_code, status_code, this.getRequest)

        return response_json
    }

    async postRequest (status_code: number) {
        const url = this.getUrl()
        const response = await this.request.post(url, {
            headers: this.apiHeaders,
            data: this.apiBody
        })

        const respone_status_code = await response.status()
        expect(respone_status_code).toBe(status_code)

        return await response.json()
    }

    async putRequest (status_code: number) {
        const url = this.getUrl()
        const response = await this.request.put(url, {
            headers: this.apiHeaders,
            data: this.apiBody
        })

        const respone_status_code = await response.status()
        expect(respone_status_code).toBe(status_code)

        return await response.json()
    }

    async deleteRequest (status_code: number) {
        const url = this.getUrl()
        const response = await this.request.delete(url, {
            headers: this.apiHeaders,
            data: this.apiBody
        })

        const respone_status_code = await response.status()
        expect(respone_status_code).toBe(status_code)

        return true
    }

    private statusCodeValidator(actualStatus: number, expectedStatus: number, callingMethod: Function) {
        if (actualStatus !== expectedStatus) {
            const logs = this.logger.getRecentLogs()
            const error = new Error(`Expected status ${expectedStatus} but got ${actualStatus}\n\n Recent Activity Log:\n\n${logs}`)
            Error.captureStackTrace(error, callingMethod)
            throw error
        }
    }
}