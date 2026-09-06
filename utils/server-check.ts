import { execSync } from 'child_process';
import path from 'path';

/**
 * Ensures the backend companion stack (PostgreSQL, Redis, Express API) is running.
 * If the server is unreachable (e.g. user ran `npm run docker:down` or running via IDE test runner),
 * this automatically boots the Docker containers and waits for health checks to pass.
 */
export async function ensureServerRunning(): Promise<void> {
    const rootDir = path.resolve(__dirname, '..');
    const healthUrl = (process.env.API_URL || 'http://127.0.0.1:3001/api') + '/health';

    // 1. Fast probe: check if server is already responding
    try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return;
    } catch {
        // Server is not responding, auto-heal
    }

    if (!process.env.CI) {
        console.log('\n[Self-Healing] Backend containers are not responding. Starting Docker compose...');
        try {
            execSync('docker compose up -d', { cwd: rootDir, stdio: 'inherit' });
        } catch (error) {
            console.error('[Self-Healing] Failed to execute docker compose up -d:', error);
        }
    } else {
        console.log(`\n[CI/Container] Probing backend health at ${healthUrl}...`);
    }

    // 2. Poll until server is healthy (up to 45 seconds)
    const startTime = Date.now();
    const timeoutMs = 45000;

    while (Date.now() - startTime < timeoutMs) {
        try {
            const res = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
            if (res.ok) {
                console.log('[Self-Healing] Backend services are healthy and ready!\n');
                return;
            }
        } catch {
            // Still starting up, wait and retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`[Self-Healing] Timed out after ${timeoutMs / 1000}s waiting for backend at ${healthUrl} to become healthy.`);
}
