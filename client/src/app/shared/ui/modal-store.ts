import { Injectable, signal } from '@angular/core';

/** Open state of the global import modal, shared by the buttons that open it and the modal itself. */
@Injectable({
    providedIn: 'root',
})
export class ModalStore {
    private readonly importOpen = signal(false);

    /** Also hides the floating import button while the modal is open. */
    public readonly isImportOpen = this.importOpen.asReadonly();

    public openImport(): void {
        this.importOpen.set(true);
    }

    public closeImport(): void {
        this.importOpen.set(false);
    }
}
