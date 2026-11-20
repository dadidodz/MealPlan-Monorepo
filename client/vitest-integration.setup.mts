import { ChildProcess, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { PRISM_PORT } from './src/testing/prism-port';

/** How long Prism may take to read the contract and start listening. */
const START_TIMEOUT_MS = 30_000;

// The Angular test builder applies this setup twice in one run (root and project): one Prism serves both
declare global {
    var prismStarted: Promise<ChildProcess> | undefined;
}

function startPrism(): Promise<ChildProcess> {
    const prismCli = createRequire(import.meta.url).resolve('@stoplight/prism-cli/dist/index.js');
    // From this file, not from the working directory, which depends on how the tests are started
    const contract = resolve(import.meta.dirname, '../contracts/openapi.yaml');
    const child = spawn(
        process.execPath,
        [prismCli, 'mock', contract, '--port', String(PRISM_PORT), '--errors'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    return new Promise<ChildProcess>((resolveStarted, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Prism did not start within ${START_TIMEOUT_MS} ms`)),
            START_TIMEOUT_MS,
        );
        let output = '';
        child.stderr?.on('data', (chunk: Buffer) => {
            output += chunk.toString();
        });
        child.stdout?.on('data', (chunk: Buffer) => {
            output += chunk.toString();
            if (output.includes('Prism is listening')) {
                clearTimeout(timer);
                resolveStarted(child);
            }
        });
        child.on('exit', (code) => {
            clearTimeout(timer);
            reject(new Error(`Prism exited before listening (code ${code}):\n${output}`));
        });
    });
}

/**
 * Starts the Prism mock of `contracts/openapi.yaml` before the integration tests, stops it after. Run with Node
 * directly (no shell), the same on Windows and on the CI's Linux.
 */
export async function setup(): Promise<void> {
    globalThis.prismStarted ??= startPrism();
    await globalThis.prismStarted;
}

export async function teardown(): Promise<void> {
    const prism = await globalThis.prismStarted;
    prism?.kill();
}
