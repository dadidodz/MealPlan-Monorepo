import { Component, computed, input, output, signal } from '@angular/core';
import { RecipeLightResponse } from '../../model/recipe.type';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import { CATEGORY_ICONS, recipeCategoryOf } from '../../model/recipe-category';

@Component({
    selector: 'app-recipe-card',
    standalone: true,
    imports: [Icon],
    templateUrl: './recipe-card.html',
})
export class RecipeCard {
    public readonly recipe = input.required<RecipeLightResponse>();

    // Not wired yet: emitted for the future delete action
    public readonly deleteRequested = output<string>();
    public readonly cardClicked = output<string>();
    public readonly isMenuOpen = signal<boolean>(false);

    /** A category this UI doesn't know yet (API deployed first) shows the `other` icon. */
    protected readonly iconName = computed<IconName>(
        () => CATEGORY_ICONS[recipeCategoryOf(this.recipe().category)],
    );

    public readonly placeholderStyle = computed(() => {
        const id = this.recipe().id;
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            // charCodeAt, not codePointAt: ids are ASCII UUIDs, and codePointAt's `undefined` would add a dead branch
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % 5;
        const styles = [
            'bg-primary/15 text-primary',
            'bg-secondary/15 text-secondary',
            'bg-accent/15 text-accent',
            'bg-info/15 text-info',
            'bg-success/15 text-success',
        ];
        return styles[index];
    });

    public onCardClick(): void {
        // Menu open: ignore the click (extra safety)
        if (this.isMenuOpen()) return;
        this.cardClicked.emit(this.recipe().id);
    }

    // Opens / closes the menu with the "..." button
    public toggleMenu(event: Event): void {
        event.stopPropagation();
        this.isMenuOpen.update((val) => !val);
    }

    // Closes the menu on a click or scroll outside
    public closeMenu(event: Event): void {
        event.stopPropagation();
        this.isMenuOpen.set(false);
    }

    public onDeleteAction(event: Event): void {
        event.stopPropagation();
        this.isMenuOpen.set(false); // Close the menu on the way
        this.deleteRequested.emit(this.recipe().id);
    }
}
