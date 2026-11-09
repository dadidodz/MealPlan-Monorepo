import { withoutQueryString } from './source-url';
import { UrlNormalizer } from './url-normalizer.port';

/** Follows only the short links registered in `redirects`; drops the query string like the real one. */
export class FakeUrlNormalizer implements UrlNormalizer {
    readonly redirects = new Map<string, string>();

    normalize(url: string): Promise<string> {
        return Promise.resolve(withoutQueryString(this.redirects.get(url) ?? url));
    }
}
