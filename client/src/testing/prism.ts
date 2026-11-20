import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { PRISM_PORT } from './prism-port';

/**
 * An HttpClient that sends the app's `/api/...` requests to the Prism mock started for the integration tests,
 * which serves the contract's paths without `/api` (as `proxy.mock.conf.json` does in development).
 * `prefer` asks Prism for a given response, such as `code=409`.
 */
export function provideHttpClientOnPrism(prefer?: string): EnvironmentProviders {
    const toPrism: HttpInterceptorFn = (request, next) =>
        next(
            request.clone({
                url: request.url.replace(/^\/api/, `http://127.0.0.1:${PRISM_PORT}`),
                setHeaders: prefer ? { Prefer: prefer } : {},
            }),
        );
    return provideHttpClient(withInterceptors([toPrism]));
}
