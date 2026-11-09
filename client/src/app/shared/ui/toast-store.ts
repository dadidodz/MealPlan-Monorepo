import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const DURATION_MS = 3000;
const MAX_VISIBLE = 3;

/** Toasts on screen, newest first. Each one disappears after its own 3 seconds, or when tapped. */
@Injectable({
    providedIn: 'root',
})
export class ToastStore {
    private readonly items = signal<Toast[]>([]);
    private nextId = 0;

    public readonly toasts = this.items.asReadonly();

    show(message: string, type: ToastType = 'info'): void {
        const id = this.nextId++;
        // Beyond the cap, the oldest toasts are dropped
        this.items.update((toasts) => [{ id, message, type }, ...toasts].slice(0, MAX_VISIBLE));
        setTimeout(() => this.dismiss(id), DURATION_MS);
    }

    /** Removes a toast now (tap on it) instead of waiting for its timer. */
    dismiss(id: number): void {
        this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));
    }

    success(message: string): void {
        this.show(message, 'success');
    }

    error(message: string): void {
        this.show(message, 'error');
    }
}
