import { routes } from './app.routes';
import { Planner } from './pages/planner/planner';

describe('routes', () => {
    it('serves the planner lazily', async () => {
        const planner = routes.find((route) => route.path === 'planner');

        expect(await planner?.loadComponent?.()).toBe(Planner);
    });

    it('serves the UI kit lazily in development builds', () => {
        const uiKit = routes.find((route) => route.path === 'ui-kit');

        expect(uiKit?.loadComponent).toBeDefined();
        expect(uiKit?.component).toBeUndefined();
    });
});
