import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ThemeStore {
    // A few built-in DaisyUI themes, deliberately varied
    public readonly availableThemes = [
        'light',
        'dark',
        'cupcake',
        'retro',
        'cyberpunk',
        'bumblebee',
        'emerald',
        'corporate',
        'synthwave',
        'valentine',
        'halloween',
        'garden',
        'forest',
        'aqua',
        'lofi',
        'pastel',
        'fantasy',
        'wireframe',
        'black',
        'luxury',
        'dracula',
        'cmyk',
        'autumn',
        'business',
        'acid',
        'lemonade',
        'night',
        'coffee',
        'winter',
        'dim',
        'nord',
        'sunset',
    ];

    // Starts from the saved theme, or 'light' by default
    public readonly currentTheme = signal<string>(localStorage.getItem('theme') ?? 'light');

    constructor() {
        // Runs every time the theme changes
        effect(() => {
            const theme = this.currentTheme();
            // Applies the theme on the <html> element
            document.documentElement.dataset['theme'] = theme;
            // Remembers the choice
            localStorage.setItem('theme', theme);
        });
    }

    public setTheme(themeName: string): void {
        if (this.availableThemes.includes(themeName)) {
            this.currentTheme.set(themeName);
        }
    }
}
