import { ComponentFixture } from '@angular/core/testing';

/** Typed access to a fixture's DOM (`fixture.nativeElement` is `any`). */
export function hostElement(fixture: ComponentFixture<unknown>): HTMLElement {
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) throw new Error('Fixture host is not an HTMLElement');
    return host;
}
