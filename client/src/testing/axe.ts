import axe from 'axe-core';

/**
 * Runs axe on a rendered element with the WCAG 2.1 A/AA rules (the base of RGAA 4.1) and returns the violations as
 * `rule: element` lines, so `expect(await axeViolations(host)).toEqual([])` says what broke and where.
 * Contrast is off: jsdom doesn't render, so axe can't compute colours (checked by the manual audit instead).
 */
export async function axeViolations(element: HTMLElement): Promise<string[]> {
    const results = await axe.run(element, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        rules: { 'color-contrast': { enabled: false } },
    });
    return results.violations.flatMap((violation) =>
        violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
    );
}
