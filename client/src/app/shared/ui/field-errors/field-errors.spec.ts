import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ValidationError } from '@angular/forms/signals';
import { axeViolations } from '../../../../testing/axe';
import { hostElement } from '../../../../testing/host-element';
import { FieldErrorSource, FieldErrors } from './field-errors';

describe('FieldErrors', () => {
    const touched = signal(false);
    const errors = signal<ValidationError[]>([
        { kind: 'blank', message: 'Le titre est obligatoire.' },
    ]);
    const field: FieldErrorSource = { touched, errors };

    async function renderHost(): Promise<HTMLElement> {
        const fixture = TestBed.createComponent(FieldErrors);
        fixture.componentRef.setInput('field', field);
        await fixture.whenStable();
        return hostElement(fixture);
    }

    async function render(): Promise<string> {
        return (await renderHost()).textContent ?? '';
    }

    it('shows nothing while the field is untouched', async () => {
        touched.set(false);
        expect(await render()).toBe('');
    });

    it('shows the messages once the field is touched', async () => {
        touched.set(true);
        expect(await render()).toContain('Le titre est obligatoire.');
    });

    it('has no accessibility violations with messages shown', async () => {
        touched.set(true);
        expect(await axeViolations(await renderHost())).toEqual([]);
    });
});
