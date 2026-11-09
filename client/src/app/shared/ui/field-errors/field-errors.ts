import { Component, input } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';

/** What the errors need from a field's state, whatever its value type. */
export interface FieldErrorSource {
    touched(): boolean;
    errors(): readonly ValidationError[];
}

/** Validation messages of a Signal Forms field, shown once the field is touched (or the form submitted). */
@Component({
    selector: 'app-field-errors',
    templateUrl: './field-errors.html',
})
export class FieldErrors {
    readonly field = input.required<FieldErrorSource>();
}
