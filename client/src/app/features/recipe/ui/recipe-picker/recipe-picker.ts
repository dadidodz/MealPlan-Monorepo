import {
    afterRenderEffect,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    linkedSignal,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../../shared/ui/error-state/error-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { RecipeApi } from '../../data-access/recipe-api';
import { CATEGORY_ICONS } from '../../model/recipe-category';
import { RecipeLightResponse } from '../../model/recipe.type';

const PAGE_SIZE = 25;

/** The recipes shown, and what the page loaded last tells about the next one. */
interface Loaded {
    recipes: RecipeLightResponse[];
    lastPageFull: boolean;
}

/** The recipe book as a list to pick from, in the book's order, loading more while scrolling. Loads its own data. */
@Component({
    selector: 'app-recipe-picker',
    imports: [RouterLink, Icon, EmptyState, ErrorState],
    templateUrl: './recipe-picker.html',
    host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class RecipePicker {
    private readonly recipeApi = inject(RecipeApi);

    readonly picked = output<RecipeLightResponse>();

    protected readonly icons = CATEGORY_ICONS;

    private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
    private readonly scrollTrigger = viewChild.required<ElementRef<HTMLElement>>('scrollTrigger');

    private readonly page = signal(1);
    protected readonly pageResource = this.recipeApi.list(this.page, PAGE_SIZE);

    /** Undefined until the first page arrives, kept while the next one loads. */
    private readonly loaded = linkedSignal<RecipeLightResponse[] | undefined, Loaded | undefined>({
        source: () => (this.pageResource.hasValue() ? this.pageResource.value() : undefined),
        computation: (page, previous) => {
            const known = previous?.value?.recipes ?? [];
            if (!page) return previous?.value;
            // Pages are fetched by offset: a recipe created meanwhile shifts them, so a page can repeat known recipes
            const knownIds = new Set(known.map((recipe) => recipe.id));
            return {
                recipes: [...known, ...page.filter((recipe) => !knownIds.has(recipe.id))],
                lastPageFull: page.length === PAGE_SIZE,
            };
        },
    });
    protected readonly recipes = computed(() => this.loaded()?.recipes);

    /** False while a page loads, so a page is never requested twice. */
    private readonly hasMore = computed(
        () => (this.loaded()?.lastPageFull ?? false) && this.pageResource.hasValue(),
    );

    constructor() {
        let observer: IntersectionObserver | undefined;
        inject(DestroyRef).onDestroy(() => observer?.disconnect());

        // Observed again after each rendered page: observe() always reports the sentinel's visibility, so a list
        // shorter than the modal fills up. The root is the list: it scrolls inside the modal, not in the viewport
        afterRenderEffect(() => {
            this.recipes();
            untracked(() => {
                observer ??= new IntersectionObserver(
                    (entries) => {
                        if (entries.at(-1)?.isIntersecting && this.hasMore()) {
                            this.page.update((page) => page + 1);
                        }
                    },
                    { root: this.scroller().nativeElement, rootMargin: '200px' },
                );
                const scrollTrigger = this.scrollTrigger().nativeElement;
                observer.unobserve(scrollTrigger);
                observer.observe(scrollTrigger);
            });
        });
    }
}
