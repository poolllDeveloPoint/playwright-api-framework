export class Logger {
    private recentLogs: any[] = []

    logRequest(method: string, url: string, headers: object, body?: object) {
        const logEntry = {method, url, headers, body}
        this.recentLogs.push({type: 'Request Detail', data: logEntry})
    }

    logResponse(statusCode: number, body: any) {
        const logEntry = {statusCode, body}
        this.recentLogs.push({type: 'Response Detail', data: logEntry})
    }

    getRecentLogs() {
        const logs = this.recentLogs.map(log => {
            return `===${log.type}===\n${JSON.stringify(log.data, null, 4)}\n\n`
        })
        return logs
    }
}
