import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../testing/axe';
import { hostElement } from '../../../../testing/host-element';
import { EmptyState } from './empty-state';

@Component({
    imports: [EmptyState],
    template: `
        <app-empty-state message="Aucune recette pour l'instant">
            <a href="/import">Importer une recette</a>
        </app-empty-state>
    `,
})
class Host {}

describe('EmptyState', () => {
    it('shows the message and the projected action', async () => {
        const fixture = TestBed.createComponent(Host);
        await fixture.whenStable();

        const host = hostElement(fixture);
        expect(host.textContent).toContain("Aucune recette pour l'instant");
        expect(host.querySelector('a')?.textContent).toBe('Importer une recette');
        expect(await axeViolations(host)).toEqual([]);
    });
});
