import { Component, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ExtractionStatus } from '../../model/extractor.type';
import { isSupportedVideoUrl } from '../../model/supported-video-url';

/** Link to extract. A one-field widget: it owns its small form and only emits the link. */
@Component({
    selector: 'app-extractor-form',
    imports: [FormField, FormRoot, Icon],
    templateUrl: './extractor-form.html',
})
export class ExtractorForm {
    readonly status = input<ExtractionStatus>('idle');

    readonly extractRequested = output<string>();
    readonly manualRequested = output();

    protected readonly linkForm = form(
        signal({ url: '' }),
        (link) => {
            validate(link.url, ({ value }) =>
                isSupportedVideoUrl(value())
                    ? undefined
                    : {
                          kind: 'unsupported-link',
                          message: 'Veuillez entrer un lien Instagram ou TikTok valide.',
                      },
            );
        },
        {
            submission: {
                action: (linkForm) => {
                    this.extractRequested.emit(linkForm.url().value().trim());
                    return Promise.resolve(undefined);
                },
            },
        },
    );

    protected onManualClick(): void {
        this.manualRequested.emit();
    }
}
