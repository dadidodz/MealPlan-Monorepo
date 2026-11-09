import { TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ImportRecipe } from './pages/import-recipe/import-recipe';
import { Icon } from './shared/ui/icon/icon';
import { ModalStore } from './shared/ui/modal-store';
import { ThemeStore } from './shared/ui/theme-store';
import { ToastStore } from './shared/ui/toast-store';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, TitleCasePipe, ImportRecipe],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    protected readonly toastStore = inject(ToastStore);
    protected readonly themeStore = inject(ThemeStore);
    protected readonly modalStore = inject(ModalStore);

    protected readonly isThemeMenuOpen = signal<boolean>(false);

    protected onThemeChange(event: Event): void {
        if (event.target instanceof HTMLSelectElement) {
            this.themeStore.setTheme(event.target.value);
        }
    }

    protected toggleThemeMenu(event: Event): void {
        event.stopPropagation();
        this.isThemeMenuOpen.update((val) => !val);
    }

    protected closeThemeMenu(event?: Event): void {
        if (event) {
            // Stop propagation and cancel the "ghost click" on elements underneath
            event.preventDefault();
            event.stopPropagation();
        }
        this.isThemeMenuOpen.set(false);
    }
}
