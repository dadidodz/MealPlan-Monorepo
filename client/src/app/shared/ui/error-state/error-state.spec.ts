import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../testing/axe';
import { hostElement } from '../../../../testing/host-element';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
    let fixture: ComponentFixture<ErrorState>;

    beforeEach(async () => {
        fixture = TestBed.createComponent(ErrorState);
        fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 0 }));
        await fixture.whenStable();
    });

    it('has no accessibility violations', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    it('shows the error as a French message', () => {
        expect(hostElement(fixture).querySelector('[role="alert"]')?.textContent).toContain(
            'Serveur injoignable. Vérifie ta connexion.',
        );
    });

    it('emits retry when "Réessayer" is clicked', () => {
        const retry = vi.fn();
        fixture.componentInstance.retry.subscribe(retry);
        hostElement(fixture).querySelector('button')?.click();
        expect(retry).toHaveBeenCalledOnce();
    });
});
