#!/usr/bin/env node

/**
 * ArticleHub Pull Request CI Simulator (Dockerized Quality Gate)
 * 
 * Simulates a production Pull Request CI pipeline locally inside an isolated
 * Docker Compose network (PostgreSQL, Redis, Express API Server, and Test Runner).
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const keepAlive = process.argv.includes('--keep-alive');

console.log('\n================================================================================');
console.log('🚀 [PR CI SIMULATOR] Simulating Pull Request Quality Gate in Docker');
console.log('================================================================================');
console.log('Target Branch : master');
console.log('Trigger Event : pull_request (simulate)');
console.log('Environment   : Isolated Docker Compose Network');
console.log('Test Matrix   : API Smoke, Negative Boundaries, Contracts, Redis & DB');
console.log('================================================================================\n');

function runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd: rootDir,
            stdio: 'inherit',
            ...options,
        });

        proc.on('close', (code) => {
            resolve(code);
        });

        proc.on('error', (err) => {
            console.error(`Error executing ${command}:`, err);
            resolve(1);
        });
    });
}

async function main() {
    console.log('📦 Step 1/3: Provisioning isolated services & running CI test runner...\n');

    // Run docker compose with ci profile
    const ciExitCode = await runCommand('docker', [
        'compose',
        '--profile',
        'ci',
        'up',
        '--build',
        '--abort-on-container-exit',
        '--exit-code-from',
        'ci-runner',
    ]);

    console.log('\n================================================================================');
    if (ciExitCode === 0) {
        console.log('✅ [PR QUALITY GATE: PASSED]');
        console.log('================================================================================');
        console.log('All API contracts, JSON schemas, PostgreSQL persistence, and Redis cache');
        console.log('assertions passed successfully inside the isolated container.');
        console.log('\n🚀 Status: APPROVED TO MERGE TO MASTER');
    } else {
        console.log('❌ [PR QUALITY GATE: FAILED]');
        console.log('================================================================================');
        console.log('One or more tests failed in the isolated CI container.');
        console.log('Review the terminal log above for contract violations or test failures.');
        console.log('\n🔒 Status: MERGE BLOCKED (Requires changes before merging)');
    }
    console.log('================================================================================\n');

    if (!keepAlive) {
        console.log('🧹 Step 3/3: Gracefully tearing down CI containers and volumes...\n');
        await runCommand('docker', ['compose', '--profile', 'ci', 'down', '-v']);
        console.log('✨ Teardown complete. Environment cleaned up.\n');
    } else {
        console.log('ℹ️ --keep-alive flag detected. Containers left running for inspection.');
        console.log('   Run `npm run docker:down` when finished.\n');
    }

    process.exit(ciExitCode);
}

main().catch((err) => {
    console.error('Fatal error during CI simulation:', err);
    process.exit(1);
});
