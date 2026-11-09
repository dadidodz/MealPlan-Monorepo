import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../testing/axe';
import { hostElement } from '../../../../testing/host-element';
import { Icon, isIconName } from './icon';

describe('Icon', () => {
    let fixture: ComponentFixture<Icon>;

    beforeEach(async () => {
        fixture = TestBed.createComponent(Icon);
        fixture.componentRef.setInput('name', 'lucideBook');
        fixture.componentRef.setInput('size', '2rem');
        await fixture.whenStable();
    });

    it('has no accessibility violations', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    it('renders the SVG of the named icon at the given size', () => {
        const icon = hostElement(fixture).querySelector('ng-icon');
        expect(icon?.querySelector('svg')).not.toBeNull();
        expect(icon?.getAttribute('style')).toContain('--ng-icon__size: 2rem');
    });

    it('renders another SVG when the name changes', async () => {
        const before = hostElement(fixture).innerHTML;
        fixture.componentRef.setInput('name', 'lucideX');
        await fixture.whenStable();
        expect(hostElement(fixture).innerHTML).not.toBe(before);
    });
});

describe('isIconName', () => {
    it('accepts a known icon', () => {
        expect(isIconName('lucideUtensils')).toBe(true);
    });

    it('rejects an unknown name', () => {
        expect(isIconName('lucideNotAnIcon')).toBe(false);
        expect(isIconName('toString')).toBe(false);
    });
});
