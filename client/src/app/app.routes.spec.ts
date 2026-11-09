import { routes } from './app.routes';

describe('routes', () => {
    it('serves the UI kit lazily in development builds', () => {
        const uiKit = routes.find((route) => route.path === 'ui-kit');

        expect(uiKit?.loadComponent).toBeDefined();
        expect(uiKit?.component).toBeUndefined();
    });
});
