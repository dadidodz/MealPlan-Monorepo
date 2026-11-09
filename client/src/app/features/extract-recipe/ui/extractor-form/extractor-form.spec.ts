import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import { ExtractorForm } from './extractor-form';

describe('ExtractorForm', () => {
    let fixture: ComponentFixture<ExtractorForm>;

    function linkInput(): HTMLInputElement {
        const input = hostElement(fixture).querySelector<HTMLInputElement>('input[type="url"]');
        if (!input) throw new Error('Link input not found');
        return input;
    }

    async function typeLink(value: string): Promise<void> {
        linkInput().value = value;
        linkInput().dispatchEvent(new Event('input'));
        await fixture.whenStable();
    }

    function submit(): void {
        hostElement(fixture)
            .querySelector('form')
            ?.dispatchEvent(new Event('submit', { cancelable: true }));
    }

    beforeEach(async () => {
        fixture = TestBed.createComponent(ExtractorForm);
        await fixture.whenStable();
    });

    it('has no accessibility violations', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    it('starts with an empty link', () => {
        expect(linkInput().value).toBe('');
    });

    it('emits a TikTok link on submit', async () => {
        const requested = vi.fn();
        fixture.componentInstance.extractRequested.subscribe(requested);

        await typeLink('  https://www.tiktok.com/@chef/video/1  ');
        submit();
        await fixture.whenStable();

        expect(requested).toHaveBeenCalledWith('https://www.tiktok.com/@chef/video/1');
    });

    it('explains and does not emit a link from another site', async () => {
        const requested = vi.fn();
        fixture.componentInstance.extractRequested.subscribe(requested);

        await typeLink('https://www.youtube.com/watch?v=1');
        submit();
        await fixture.whenStable();

        expect(hostElement(fixture).textContent).toContain(
            'Veuillez entrer un lien Instagram ou TikTok valide.',
        );
        expect(requested).not.toHaveBeenCalled();
    });
});
