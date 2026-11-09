import { Component, input } from '@angular/core';

/** Message shown when a list has no item; projected content offers a way forward (link, button). */
@Component({
    selector: 'app-empty-state',
    templateUrl: './empty-state.html',
})
export class EmptyState {
    readonly message = input.required<string>();
}
