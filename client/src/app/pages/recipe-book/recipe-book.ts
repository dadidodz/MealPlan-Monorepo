import {
    afterRenderEffect,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    linkedSignal,
    untracked,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { RecipeApi } from '../../features/recipe/data-access/recipe-api';
import { RecipeLightResponse } from '../../features/recipe/model/recipe.type';
import { RecipeCard } from '../../features/recipe/ui/recipe-card/recipe-card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { Icon } from '../../shared/ui/icon/icon';
import { ModalStore } from '../../shared/ui/modal-store';

const PAGE_SIZE = 25;

/** What the resource fetches: the next page for the bottom, or page 1 again to merge recipes created meanwhile. */
interface PageRequest {
    page: number;
    merge: boolean;
}

/** The recipes shown, and what the bottom page loaded last tells about the next one. */
interface Book {
    recipes: RecipeLightResponse[];
    loadedPages: number;
    lastPageFull: boolean;
}

@Component({
    selector: 'app-recipe-book',
    imports: [RecipeCard, Icon, EmptyState, ErrorState],
    templateUrl: './recipe-book.html',
})
export class RecipeBook {
    private readonly recipeApi = inject(RecipeApi);
    protected readonly modalStore = inject(ModalStore);
    private readonly router = inject(Router);

    private readonly scrollTrigger = viewChild.required<ElementRef<HTMLElement>>('scrollTrigger');

    /** Page 1 at first; after each created recipe, page 1 again to merge it on top without losing the scroll. */
    private readonly request = linkedSignal<number, PageRequest>({
        source: this.recipeApi.revision,
        computation: (_, previous) => ({ page: 1, merge: previous !== undefined }),
    });
    protected readonly pageResource = this.recipeApi.list(() => this.request().page, PAGE_SIZE);

    /** Undefined until the first page arrives, kept while the next one loads. */
    private readonly book = linkedSignal<
        { request: PageRequest; recipes: RecipeLightResponse[] } | undefined,
        Book | undefined
    >({
        source: () =>
            this.pageResource.hasValue()
                ? { request: this.request(), recipes: this.pageResource.value() }
                : undefined,
        computation: (loaded, previous) => {
            const book = previous?.value;
            if (!loaded) return book;
            const { request, recipes } = loaded;
            if (!book) {
                return { recipes, loadedPages: 1, lastPageFull: recipes.length === PAGE_SIZE };
            }
            // Pages are fetched by offset: recipes created since shift them, so a page can repeat known recipes
            const known = new Set(book.recipes.map((recipe) => recipe.id));
            const unseen = recipes.filter((recipe) => !known.has(recipe.id));
            if (request.merge) return { ...book, recipes: [...unseen, ...book.recipes] };
            return {
                recipes: [...book.recipes, ...unseen],
                loadedPages: request.page,
                lastPageFull: recipes.length === PAGE_SIZE,
            };
        },
    });
    protected readonly recipes = computed(() => this.book()?.recipes);

    /**
     * The last bottom page was full, so there may be more; false while a page loads, so a page is never requested
     * twice. Reads `book()`: `linkedSignal` is lazy, so the loaded page is added to the list before the next request,
     * even if the sentinel reports before the page is rendered.
     */
    protected readonly hasMore = computed(
        () => (this.book()?.lastPageFull ?? false) && this.pageResource.hasValue(),
    );

    constructor() {
        let observer: IntersectionObserver | undefined;
        inject(DestroyRef).onDestroy(() => observer?.disconnect());

        // Observed again after each rendered page: observe() always reports the sentinel's visibility once the new
        // cards are laid out, so a screen taller than one page fills up, and a page that pushes the sentinel off
        // screen loads nothing more until the user scrolls
        afterRenderEffect(() => {
            this.recipes();
            untracked(() => {
                // 200px margin: the next page starts loading before the user reaches the bottom
                observer ??= new IntersectionObserver(
                    (entries) => {
                        if (entries.at(-1)?.isIntersecting && this.hasMore()) {
                            this.loadNextPage();
                        }
                    },
                    { rootMargin: '200px' },
                );
                const scrollTrigger = this.scrollTrigger().nativeElement;
                observer.unobserve(scrollTrigger);
                observer.observe(scrollTrigger);
            });
        });
    }

    private loadNextPage(): void {
        const loadedPages = this.book()?.loadedPages ?? 0;
        this.request.set({ page: loadedPages + 1, merge: false });
    }

    public goToRecipe(recipeId: string): void {
        void this.router.navigate(['/recipes', recipeId]);
    }

    public deleteRecipe(recipeId: string): void {
        console.log('Delete recipe:', recipeId);
        // Call RecipeApi here to delete from the database
    }
}
