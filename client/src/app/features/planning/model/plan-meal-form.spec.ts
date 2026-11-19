import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { PlanMealFormModel, planMealFormSchema } from './plan-meal-form';

describe('planMealFormSchema', () => {
    function peopleValid(peopleCount: number | null): boolean {
        const model = signal<PlanMealFormModel>({ recipe: null, peopleCount });
        const planForm = form(model, planMealFormSchema, { injector: TestBed.inject(Injector) });
        return planForm.peopleCount().valid();
    }

    it.each([1, 2, 100])('accepts %s people', (people) => {
        expect(peopleValid(people)).toBe(true);
    });

    it.each([null, 0, -1, 1.5, 101])('refuses %s people', (people) => {
        expect(peopleValid(people)).toBe(false);
    });
});
