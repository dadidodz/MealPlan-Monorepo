import { Injectable, Logger } from '@nestjs/common';

export type DependencyName = 'tiktok' | 'instagram' | 'gemini';
export type DependencyStatus = 'ok' | 'failing';
export type DependenciesReport = Record<DependencyName, DependencyStatus>;

/**
 * External hosts the recipe extraction needs. Any HTTP answer (even 403 or 404) counts as reachable: the probe
 * only looks for DNS, network and TLS failures, like the 2026-10 incident (containers started without DNS).
 * No API key is sent: probing costs nothing.
 */
const DEPENDENCIES: Record<DependencyName, string> = {
    tiktok: 'https://www.tiktok.com',
    instagram: 'https://www.instagram.com',
    gemini: 'https://generativelanguage.googleapis.com',
};

/** The endpoint is public: the cache caps the outbound requests at one round per minute, whatever the traffic. */
const CACHE_MS = 60_000;
const TIMEOUT_MS = 5_000;

@Injectable()
export class DependenciesProbe {
    private readonly logger = new Logger(DependenciesProbe.name);

    private cached?: { at: number; report: Promise<DependenciesReport> };

    check(): Promise<DependenciesReport> {
        const now = Date.now();
        if (this.cached === undefined || now - this.cached.at >= CACHE_MS) {
            // The promise is cached, not its result: concurrent calls share one round of requests
            this.cached = { at: now, report: this.probeAll() };
        }
        return this.cached.report;
    }

    private async probeAll(): Promise<DependenciesReport> {
        const [tiktok, instagram, gemini] = await Promise.all([
            this.probe('tiktok'),
            this.probe('instagram'),
            this.probe('gemini'),
        ]);
        return { tiktok, instagram, gemini };
    }

    private async probe(name: DependencyName): Promise<DependencyStatus> {
        const url = DEPENDENCIES[name];
        try {
            await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
            return 'ok';
        } catch (error) {
            // The cause (ENOTFOUND, timeout...) stays in the log: the response only says ok/failing
            this.logger.warn(`${name} unreachable (${url})`, error);
            return 'failing';
        }
    }
}
