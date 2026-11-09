import { Injectable, Logger } from '@nestjs/common';
import { withoutQueryString } from '../domain/source-url';
import { UrlNormalizer } from '../domain/url-normalizer.port';

/** Short-link hosts: the real video URL is only known after following the redirect. */
const SHORT_LINK_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'instagr.am']);

/**
 * Exact host match, never a substring: `http://192.168.1.10/vm.tiktok.com` must not make the API call an
 * arbitrary machine (SSRF). An unparsable link is not a short link.
 */
function isShortLink(url: string): boolean {
    try {
        return SHORT_LINK_HOSTS.has(new URL(url).hostname);
    } catch {
        return false;
    }
}

@Injectable()
export class FetchUrlNormalizer implements UrlNormalizer {
    private readonly logger = new Logger(FetchUrlNormalizer.name);

    async normalize(url: string): Promise<string> {
        if (!isShortLink(url)) {
            return withoutQueryString(url);
        }

        try {
            // HEAD: the redirects give the final URL without downloading the page
            const response = await fetch(url, {
                method: 'HEAD',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            return withoutQueryString(response.url);
        } catch (error) {
            this.logger.warn(`Could not follow the short link ${url}: kept as is`, error);
            return withoutQueryString(url);
        }
    }
}
