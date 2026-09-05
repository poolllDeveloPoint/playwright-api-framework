import { APIRequestContext, APIResponse, expect } from "@playwright/test"
import { APILogger } from "./logger"

export class RequestHandler {
    private request: APIRequestContext
    private defaultBaseUrl: string
    private baseUrl?: string
    private apiPath: string = ''
    private apiParams: object = {}
    private apiHeaders: Record<string, string> = {}
    private apiBody: object = {}
    private logger: APILogger
    private defaultAuthToken: string = ''
    private clearAuthToken: boolean = false

    constructor(request: APIRequestContext, apiBaseUrl: string, logger: APILogger, authToken: string = '') {
        this.request = request
        this.defaultBaseUrl = apiBaseUrl
        this.logger = logger
        this.defaultAuthToken = authToken
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

    clearAuth () {
        this.clearAuthToken = true
        return this
    }

    private getUrl() {
        const url = new URL(`${this.baseUrl ?? this.defaultBaseUrl}${this.apiPath}`)
        for (const [key, value] of Object.entries(this.apiParams)) {
            url.searchParams.append(key, value)
        }
        return url.toString()
    }

    private async getJsonResponse(response: APIResponse) {
        try {
            return await response.json()
        } catch (error) {
            const respone_status_code = response.status()
            const not_content_status_code = [204, 404]
            const is_not_content_status_code = not_content_status_code.includes(respone_status_code)

            if (is_not_content_status_code) {
                return {}
            }

            return {rawBody: await response.text()}
        }
    }

    async getRequest (status_code: number) {
        const url = this.getUrl()
        this.logger.logRequest('GET', url, this.getHeaders())
        const response = await this.request.get(url, {
            headers: this.getHeaders(),
        })

        this.cleanupFields()

        const response_status_code = response.status()
        const response_json = await this.getJsonResponse(response)
        this.logger.logResponse(response_status_code, response_json)
        this.statusCodeValidator(response_status_code, status_code, this.getRequest)

        return response_json
    }

    async getResponseWithHeaders(status_code: number): Promise<{ body: any; headers: Record<string, string>; status: number }> {
        const url = this.getUrl()
        this.logger.logRequest('GET', url, this.getHeaders())
        const response = await this.request.get(url, {
            headers: this.getHeaders(),
        })

        this.cleanupFields()

        const response_status_code = response.status()
        const response_json = await this.getJsonResponse(response)
        this.logger.logResponse(response_status_code, response_json)
        this.statusCodeValidator(response_status_code, status_code, this.getRequest)

        return {
            body: response_json,
            headers: response.headers(),
            status: response_status_code,
        }
    }

    async postRequest (status_code: number) {
        const url = this.getUrl()
        this.logger.logRequest('POST', url, this.getHeaders(), this.apiBody)
        const response = await this.request.post(url, {
            headers: this.getHeaders(),
            data: this.apiBody
        })

        this.cleanupFields()

        const response_status_code = response.status()
        const response_json = await this.getJsonResponse(response)
        this.logger.logResponse(response_status_code, response_json)
        this.statusCodeValidator(response_status_code, status_code, this.postRequest)

        return response_json
    }

    async putRequest (status_code: number) {
        const url = this.getUrl()
        this.logger.logRequest('PUT', url, this.getHeaders(), this.apiBody)
        const response = await this.request.put(url, {
            headers: this.getHeaders(),
            data: this.apiBody
        })

        this.cleanupFields()

        const response_status_code = response.status()
        const response_json = await this.getJsonResponse(response)
        this.statusCodeValidator(response_status_code, status_code, this.putRequest)

        return response_json
    }

    async deleteRequest (status_code: number) {
        const url = this.getUrl()
        this.logger.logRequest('DELETE', url, this.getHeaders(), this.apiBody)
        const response = await this.request.delete(url, {
            headers: this.getHeaders(),
            data: this.apiBody
        })

        this.cleanupFields()

        const response_status_code = response.status()
        const response_json = await this.getJsonResponse(response)
        this.logger.logResponse(response_status_code, response_json)
        this.statusCodeValidator(response_status_code, status_code, this.deleteRequest)

        return response_json
    }

    private statusCodeValidator(actualStatus: number, expectedStatus: number, callingMethod: Function) {
        if (actualStatus !== expectedStatus) {
            const logs = this.logger.getRecentLogs()
            const error = new Error(`Expected status ${expectedStatus} but got ${actualStatus}\n\n Recent Activity Log:\n\n${logs}`)
            Error.captureStackTrace(error, callingMethod)
            throw error
        }
    }

    private getHeaders() {
        if (!this.clearAuthToken) {
            this.apiHeaders['Authorization'] = this.apiHeaders['Authorization'] || this.defaultAuthToken
        }
        return this.apiHeaders
    }

    private cleanupFields() {
        this.apiHeaders = {}
        this.apiBody = {}
        this.apiParams = {}
        this.apiPath = ''
        this.baseUrl = undefined
        this.clearAuthToken = false
    }
}