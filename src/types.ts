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

/**
 * Defines the data output from validating an import map.
 */
export interface ValidationResult {
    /**
     * Indicates whether the import map is valid.
     */
    readonly valid: boolean;
    /**
     * List of validation error messages.
     */
    readonly errors: string[];
}

/**
 * Defines the capabilities provided by resolver objects.
 */
export interface Resolver {
    /**
     * Resolves a module specifier using the contained import map.
     * 
     * **IMPORTANT**:  Resolution cannot take place against scoped mappings without an importer.
     * @param specifier Module specifier to resolve.
     * @param importer Optional importer value.
     * @returns Resolved module specifier if a match was found; `undefined` if the input identifier 
     * was a bare module identifier; the `specifier` when no match was found but it is a relative, 
     * absolute or full URL.
     */
    resolve(specifier: string, importer?: string | undefined): string | undefined;
    readonly valid: boolean;
    readonly validationResult: ValidationResult;
}
