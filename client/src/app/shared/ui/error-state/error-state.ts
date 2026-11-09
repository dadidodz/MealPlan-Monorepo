import { Component, computed, input, output } from '@angular/core';
import { toUserMessage } from '../../../core/http/to-user-message';

/** In-page error of a failed read, with a retry button. */
@Component({
    selector: 'app-error-state',
    templateUrl: './error-state.html',
})
export class ErrorState {
    readonly error = input.required<unknown>();
    readonly retry = output();

    protected readonly message = computed(() => toUserMessage(this.error()));
}
