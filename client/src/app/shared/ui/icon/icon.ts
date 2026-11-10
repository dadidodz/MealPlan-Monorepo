import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
    lucideAlertCircle,
    lucideArrowLeft,
    lucideBeef,
    lucideBook,
    lucideCakeSlice,
    lucideCalendarDays,
    lucideCarrot,
    lucideCheck,
    lucideChefHat,
    lucideChevronLeft,
    lucideChevronRight,
    lucideCircleCheck,
    lucideCircleX,
    lucideCoffee,
    lucideCookingPot,
    lucideCroissant,
    lucideDrumstick,
    lucideExternalLink,
    lucideFish,
    lucideGripVertical,
    lucideInfo,
    lucideListChecks,
    lucideMoreVertical,
    lucidePalette,
    lucidePenLine,
    lucidePencil,
    lucidePizza,
    lucidePlus,
    lucideSalad,
    lucideSandwich,
    lucideShoppingCart,
    lucideSoup,
    lucideTrash2,
    lucideUsers,
    lucideUtensils,
    lucideWand2,
    lucideX,
} from '@ng-icons/lucide';

/** Every icon the app can show (name → SVG). The only place that knows the icon library. */
const ICONS = {
    lucideAlertCircle,
    lucideArrowLeft,
    lucideBeef,
    lucideBook,
    lucideCakeSlice,
    lucideCalendarDays,
    lucideCarrot,
    lucideCheck,
    lucideChefHat,
    lucideChevronLeft,
    lucideChevronRight,
    lucideCircleCheck,
    lucideCircleX,
    lucideCoffee,
    lucideCookingPot,
    lucideCroissant,
    lucideDrumstick,
    lucideExternalLink,
    lucideFish,
    lucideGripVertical,
    lucideInfo,
    lucideListChecks,
    lucideMoreVertical,
    lucidePalette,
    lucidePenLine,
    lucidePencil,
    lucidePizza,
    lucidePlus,
    lucideSalad,
    lucideSandwich,
    lucideShoppingCart,
    lucideSoup,
    lucideTrash2,
    lucideUsers,
    lucideUtensils,
    lucideWand2,
    lucideX,
};

export type IconName = keyof typeof ICONS;

/** Narrows a name coming from outside (e.g. the API) to a known icon. */
export function isIconName(name: string): name is IconName {
    return Object.hasOwn(ICONS, name);
}

/** Shows an icon; size is any CSS length, colour follows the text colour. */
@Component({
    selector: 'app-icon',
    imports: [NgIcon],
    templateUrl: './icon.html',
    host: { class: 'inline-flex' },
})
export class Icon {
    readonly name = input.required<IconName>();
    readonly size = input('1em');

    protected readonly svg = computed(() => ICONS[this.name()]);
}
