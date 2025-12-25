import { ValidationResult } from "./types.js";

export class ValidationResultImpl implements ValidationResult {
    #valid;
    #errors;

    constructor(valid = true) {
        this.#valid = valid;
        this.#errors = [] as string[];
    }

    get valid() {
        return this.#valid;
    }
    get errors() {
        return [...this.#errors];
    }

    addError(error: string) {
        this.#valid = false;
        this.#errors.push(error);
    }
}
