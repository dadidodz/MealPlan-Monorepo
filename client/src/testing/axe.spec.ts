import { axeViolations } from './axe';

describe('axeViolations', () => {
    it('reports an icon-only button without a name, and passes once it has one', async () => {
        const host = document.createElement('div');
        host.innerHTML = '<button type="button"><svg aria-hidden="true"></svg></button>';
        document.body.appendChild(host);

        expect(await axeViolations(host)).toEqual(['button-name: button']);

        host.querySelector('button')?.setAttribute('aria-label', 'Fermer');
        expect(await axeViolations(host)).toEqual([]);
        host.remove();
    });
});
