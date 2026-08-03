import { APIRequestContext, expect } from "@playwright/test"

export class RequestHandler {
    private request: APIRequestContext
    private defaultBaseUrl: string
    private baseUrl: string
    private apiPath: string
    private apiParams: object
    private apiHeaders: Record<string, string>
    private apiBody: object

    constructor(request: APIRequestContext, apiBaseUrl: string) {
        this.request = request
        this.defaultBaseUrl = apiBaseUrl
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
        const response = await this.request.get(url, {
            headers: this.apiHeaders,
        })

        const respone_status_code = await response.status()
        expect(respone_status_code).toBe(status_code)

        return await response.json()
    }
}