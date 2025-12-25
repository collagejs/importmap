/**
 * Defines the structure of an import map.
 * 
 * [Spec](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps)
 * 
 * [MDN Online](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
 */
export interface ImportMap {
    /**
     * Module specifier mappings.
     */
    imports?: Record<string, string>;
    /**
     * Scoped module specifier mappings.
     */
    scopes?: Record<string, Record<string, string>>;
    /**
     * Integrity metadata for the import map.
     */
    integrity?: Record<string, string>;
}

export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: string[];
}

export interface Resolver {
    resolve(specifier: string, importer?: string | undefined): string | undefined;
    readonly valid: boolean;
    readonly validationResult: ValidationResult;
}
