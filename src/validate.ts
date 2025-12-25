import type { ImportMap, ValidationResult } from "./types.js";
import { ValidationResultImpl } from "./ValidationResult.js";

export function validate(importMap: ImportMap): ValidationResult {
    const result = new ValidationResultImpl();

    if (!importMap || typeof importMap !== 'object') {
        result.addError('Import map must be an object.');
        return result;
    }

    // Ensure it's a plain object (POJO) to prevent code injection
    if (!isPlainObject(importMap)) {
        result.addError('Import map must be a plain object (not a class instance, Date, Array, etc.).');
        return result;
    }

    // Validate imports section
    if (importMap.imports !== undefined) {
        if (typeof importMap.imports !== 'object' || importMap.imports === null) {
            result.addError('The "ImportMap.imports" field must be an object.');
        } else if (!isPlainObject(importMap.imports)) {
            result.addError('The "ImportMap.imports" field must be a plain object.');
        } else {
            validateImportEntries(importMap.imports, result, 'Import');
        }
    }

    // Validate scopes section
    if (importMap.scopes !== undefined) {
        if (typeof importMap.scopes !== 'object' || importMap.scopes === null) {
            result.addError('The "ImportMap.scopes" field must be an object.');
        } else if (!isPlainObject(importMap.scopes)) {
            result.addError('The "ImportMap.scopes" field must be a plain object.');
        } else {
            for (const [scopePrefix, scopeImports] of Object.entries(importMap.scopes)) {
                if (typeof scopeImports !== 'object' || scopeImports === null) {
                    result.addError(`Scope imports for "${scopePrefix}" must be an object.`);
                    continue;
                } else if (!isPlainObject(scopeImports)) {
                    result.addError(`Scope imports for "${scopePrefix}" must be a plain object.`);
                    continue;
                }

                // Validate scope prefix
                if (scopePrefix === '') {
                    result.addError('The scope object must not define an empty scope prefix.');
                    // Don't continue - still validate the scope contents
                }

                // Validate scope prefix is a valid URL or relative path
                if (scopePrefix.includes('://')) {
                    try {
                        new URL(scopePrefix);
                    } catch (e) {
                        result.addError(`Scope prefix "${scopePrefix}" appears to be a malformed URL`);
                    }
                }

                // Validate each import in the scope
                validateImportEntries(scopeImports, result, 'Scoped import', scopePrefix);
            }
        }
    }

    // Validate integrity section
    if (importMap.integrity !== undefined) {
        if (typeof importMap.integrity !== 'object' || importMap.integrity === null) {
            result.addError('The "ImportMap.integrity" field must be an object.');
        } else if (!isPlainObject(importMap.integrity)) {
            result.addError('The "ImportMap.integrity" field must be a plain object.');
        } else {
            validateIntegrityEntries(importMap.integrity, result);
        }
    }

    // Check for unknown top-level keys
    const validKeys = new Set(['imports', 'scopes', 'integrity']);
    for (const key of Object.keys(importMap)) {
        if (!validKeys.has(key)) {
            result.addError(`Unknown import map key: "${key}"`);
        }
    }

    return result;
}

function isFullUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isPlainObject(obj: any): boolean {
    // Check if it's an object and not null
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    // Try to detect proxies - they can be used to hide malicious behavior
    if (isProxy(obj)) {
        return false;
    }

    // Check if it's created by Object constructor or has no prototype
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
}

function isProxy(obj: any): boolean {
    try {
        // Method 1: Check for proxy-specific behavior inconsistencies
        const keys1 = Object.keys(obj);
        const keys2 = Object.keys(obj);

        // If it's a proxy, multiple calls might return different results
        if (keys1.length !== keys2.length) {
            return true;
        }

        // Method 2: Test for suspicious property existence
        const testProp = '__proxy_detection_test_' + Math.random();
        if (testProp in obj) {
            // If a random property I just made up exists, that's BS!
            return true;
        }

        // Method 3: Check Object.prototype.toString behavior
        const toString = Object.prototype.toString.call(obj);
        if (toString !== '[object Object]') {
            // Not necessarily a proxy, but not a plain object either
            return true;
        }

        // Method 4: Test property access consistency
        const testValue = obj[testProp];
        const testValue2 = obj[testProp];

        // If a non-existent property returns different values, it's likely a proxy
        if (testValue !== testValue2) {
            return true;
        }

        return false;
    } catch {
        // If any of the detection methods throw, assume it might be a proxy
        return true;
    }
}

function validateImportEntries(
    imports: Record<string, string>,
    result: ValidationResultImpl,
    contextPrefix: string,
    scopePrefix?: string
): void {
    const scopeContext = scopePrefix ? ` in scope "${scopePrefix}"` : '';

    for (const [specifier, address] of Object.entries(imports)) {
        if (typeof address !== 'string') {
            result.addError(`${contextPrefix} address for "${specifier}"${scopeContext} must be a string.`);
            continue;
        }

        // Validate specifier format
        if (specifier === '') {
            result.addError(`${contextPrefix} specifier${scopeContext} cannot be empty.`);
        }

        // Validate address format
        if (address === '') {
            result.addError(`${contextPrefix} address for "${specifier}"${scopeContext} cannot be empty.`);
        }

        // Only proceed with URL validation if both specifier and address are non-empty
        if (specifier === '' || address === '') {
            continue;
        }

        // Check for invalid characters in URLs
        if (isFullUrl(address)) {
            try {
                new URL(address);
            } catch (e) {
                result.addError(`${contextPrefix} address "${address}"${scopeContext} is not a valid URL.`);
            }
        } else if (address.includes('://')) {
            result.addError(`${contextPrefix} address "${address}"${scopeContext} appears to be a malformed URL.`);
        } else {
            // Validate relative/absolute URLs by using a base URL
            try {
                new URL(address, 'http://example.com');
            } catch (e) {
                result.addError(`${contextPrefix} address "${address}"${scopeContext} contains invalid URL characters.`);
            }
        }

        // Unicode security validation for all address types
        const unicodeIssues = validateUnicodeSecurity(address);
        if (unicodeIssues.length > 0) {
            for (const issue of unicodeIssues) {
                result.addError(`${contextPrefix} address "${address}"${scopeContext} ${issue}.`);
            }
        }

        // Validate trailing slash consistency
        if (specifier.endsWith('/') && !address.endsWith('/')) {
            result.addError(`${contextPrefix} specifier "${specifier}"${scopeContext} ends with "/" but address "${address}" does not.`);
        }
    }
}

function validateUnicodeSecurity(url: string): string[] {
    const issues: string[] = [];

    // Check for invisible/zero-width characters
    const invisibleChars = /[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u206A-\u206F\uFEFF]/;
    if (invisibleChars.test(url)) {
        issues.push('contains invisible or zero-width Unicode characters');
    }

    // Check for bidirectional text attacks (RTL override, etc.)
    const bidiChars = /[\u202A-\u202E\u2066-\u2069]/;
    if (bidiChars.test(url)) {
        issues.push('contains bidirectional text control characters that could be used for spoofing');
    }

    // Check for mixed scripts that could indicate homograph attacks
    const hasLatin = /[A-Za-z]/.test(url);
    const hasCyrillic = /[\u0400-\u04FF]/.test(url);
    const hasGreek = /[\u0370-\u03FF]/.test(url);
    const hasArabic = /[\u0600-\u06FF]/.test(url);
    const hasHebrew = /[\u0590-\u05FF]/.test(url);

    const scriptCount = [hasLatin, hasCyrillic, hasGreek, hasArabic, hasHebrew].filter(Boolean).length;
    if (scriptCount > 1) {
        issues.push('contains mixed scripts that could indicate a homograph attack');
    }

    // Check for suspicious homograph characters commonly used in attacks
    const suspiciousCharMap = new Map([
        // Cyrillic that look like Latin
        ['\u0430', { looks: 'a', name: 'Cyrillic small letter a' }], // а
        ['\u043E', { looks: 'o', name: 'Cyrillic small letter o' }], // о
        ['\u0440', { looks: 'p', name: 'Cyrillic small letter er' }], // р
        ['\u0435', { looks: 'e', name: 'Cyrillic small letter ie' }], // е
        ['\u0443', { looks: 'y', name: 'Cyrillic small letter u' }], // у
        ['\u0445', { looks: 'x', name: 'Cyrillic small letter ha' }], // х
        // Greek that look like Latin
        ['\u03BF', { looks: 'o', name: 'Greek small letter omicron' }], // ο
        ['\u03B1', { looks: 'a', name: 'Greek small letter alpha' }], // α
    ]);

    // Single loop through URL characters for efficiency
    for (let i = 0; i < url.length; i++) {
        const char = url[i];
        const code = url.codePointAt(i);

        // Check for suspicious homograph characters
        const suspicious = suspiciousCharMap.get(char);
        if (suspicious) {
            issues.push(`contains '${char}' (U+${code?.toString(16).toUpperCase()}) which looks like '${suspicious.looks}' but is a different Unicode character`);
        }

        // Check for high Unicode characters
        if (code && code > 0x10000) {
            // Supplementary characters (emoji, etc.) are unusual in URLs
            issues.push(`contains high Unicode character '${char}' (U+${code.toString(16).toUpperCase()}) which is unusual in URLs`);
        }
    }

    return issues;
}

function validateIntegrityEntries(
    integrity: Record<string, string>, 
    result: ValidationResultImpl
): void {
    for (const [url, integrityValue] of Object.entries(integrity)) {
        if (typeof integrityValue !== 'string') {
            result.addError(`Integrity value for "${url}" must be a string.`);
            continue;
        }
        
        // Validate URL format
        if (url === '') {
            result.addError('Integrity URL cannot be empty.');
        }
        
        // Validate integrity value format (SRI)
        if (integrityValue === '') {
            result.addError(`Integrity value for "${url}" cannot be empty`);
        }
        
        // Only proceed with detailed validation if both URL and value are non-empty
        if (url === '' || integrityValue === '') {
            continue;
        }
        
        // Basic URL validation for integrity keys
        try {
            if (isFullUrl(url)) {
                new URL(url);
            } else {
                // Validate relative/absolute URLs
                new URL(url, 'http://example.com');
            }
        } catch (e) {
            result.addError(`Integrity URL "${url}" is not a valid URL.`);
            continue;
        }
        
        // Unicode security validation for integrity URLs
        const unicodeIssues = validateUnicodeSecurity(url);
        if (unicodeIssues.length > 0) {
            for (const issue of unicodeIssues) {
                result.addError(`Integrity URL "${url}" ${issue}.`);
            }
        }
        
        if (!isValidIntegrityValue(integrityValue)) {
            result.addError(`Integrity value "${integrityValue}" for "${url}" is not a valid subresource integrity hash.`);
        }
    }
}

function isValidIntegrityValue(integrity: string): boolean {
    // SRI format: algorithm-base64hash (can have multiple separated by spaces)
    // Valid algorithms: sha256, sha384, sha512
    const sriPattern = /^(sha256|sha384|sha512)-[A-Za-z0-9+/]+=*(\s+(sha256|sha384|sha512)-[A-Za-z0-9+/]+=*)*$/;
    return sriPattern.test(integrity.trim());
}
