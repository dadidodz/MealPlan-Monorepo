import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientOnPrism } from '../../../../testing/prism';
import { RecipeApi } from './recipe-api';

// Against the Prism mock of contracts/openapi.yaml: requests the contract refuses fail, responses come from it
describe('RecipeApi on the contract', () => {
    it('reads a page of the book in the contract shape', async () => {
        TestBed.configureTestingModule({ providers: [provideHttpClientOnPrism()] });
        const api = TestBed.inject(RecipeApi);
        const page = runInInjectionContext(TestBed.inject(Injector), () => api.list(() => 1, 25));

        await TestBed.inject(ApplicationRef).whenStable();

        expect(page.error()).toBeUndefined();
        const recipe = page.value()?.[0];
        expect(recipe?.title).toEqual(expect.stringMatching(/\S/));
        expect(Number.isInteger(recipe?.basePortions)).toBe(true);
    });
});
