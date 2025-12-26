import type { ImportMap, Resolver } from "./types.js";
import { validate } from "./validate.js";

export class ResolverImpl implements Resolver {
    #im;
    #validationResult;
    #sortedImports: Array<[string, string]> = [];
    #sortedScopes: Array<[string, Array<[string, string]>]> = [];

    constructor(importMap: ImportMap) {
        this.#im = importMap;
        this.#validationResult = validate(importMap);
        if (this.#validationResult.valid) {
            this.#prepareResolutionData();
        }
    }

    resolve(specifier: string, importer?: string | undefined): string | undefined {
        if (!this.#validationResult.valid) {
            throw new Error('Cannot resolve using an invalid import map.');
        }

        // Step 1: Try scoped resolution first if importer is provided
        if (importer && this.#im.scopes) {
            const resolvedFromScope = this.#resolveFromScopes(specifier, importer);
            if (resolvedFromScope !== null) {
                return resolvedFromScope;
            }
        }

        // Step 2: Try global imports resolution
        if (this.#sortedImports.length > 0) {
            const resolvedFromImports = this.#resolveFromSortedImports(specifier, this.#sortedImports);
            if (resolvedFromImports !== null) {
                return resolvedFromImports;
            }
        }

        // Step 3: Handle different specifier types based on import map resolution results
        if (this.#isBareSpecifier(specifier)) {
            // Bare specifiers that weren't resolved return undefined
            return undefined;
        }

        // For relative URLs, resolve relative to importer if provided
        if (this.#isRelativeURL(specifier)) {
            if (importer) {
                return this.#resolveRelativePath(specifier, importer);
            }
            return specifier;
        }

        // Absolute URLs that weren't resolved in import map are returned as-is
        return specifier;
    }

    #prepareResolutionData(): void {
        // Prepare sorted imports (by key length, descending)
        if (this.#im.imports) {
            this.#sortedImports = Object.entries(this.#im.imports)
                .sort(([a], [b]) => b.length - a.length);
        }

        // Prepare sorted scopes (by scope prefix length, descending)
        if (this.#im.scopes) {
            this.#sortedScopes = Object.entries(this.#im.scopes)
                .map(([scopePrefix, scopeImports]) => [
                    scopePrefix,
                    Object.entries(scopeImports).sort(([a], [b]) => b.length - a.length)
                ] as [string, Array<[string, string]>])
                .sort(([a], [b]) => b.length - a.length);
        }
    }

    #resolveFromScopes(specifier: string, importer: string): string | null {
        // Find the first (longest) matching scope
        for (const [scopePrefix, sortedScopeImports] of this.#sortedScopes) {
            if (this.#doesScopeMatch(importer, scopePrefix)) {
                const resolved = this.#resolveFromSortedImports(specifier, sortedScopeImports);
                if (resolved !== null) {
                    return resolved;
                }
            }
        }

        return null;
    }

    #resolveFromSortedImports(specifier: string, sortedImports: Array<[string, string]>): string | null {
        // Iterate through pre-sorted imports (longest first)
        for (const [key, value] of sortedImports) {
            // Exact match
            if (key === specifier) {
                return value;
            }

            // Prefix match for package-like specifiers
            if (key.endsWith('/') && specifier.startsWith(key)) {
                return value + specifier.slice(key.length);
            }
        }

        return null;
    }

    #doesScopeMatch(importer: string, scopePrefix: string): boolean {
        // Exact match or prefix match for directory scopes
        return importer === scopePrefix ||
            (scopePrefix.endsWith('/') && importer.startsWith(scopePrefix));
    }

    #resolveRelativePath(specifier: string, importer: string): string {
        // If importer doesn't contain '/', it's not a valid path or URL - return specifier as-is
        if (!importer.includes('/')) {
            return specifier;
        }
        
        // Extract the directory part of the importer
        const importerDir = importer.substring(0, importer.lastIndexOf('/') + 1);

        // Split the specifier into segments
        const segments = specifier.split('/');
        
        // For URLs, extract only the path part for segment manipulation
        let importerSegments: string[];
        let isImporterUrl = false;
        let importerOrigin = '';
        
        if (this.#hasValidOrigin(importer)) {
            try {
                const url = new URL(importer);
                importerOrigin = url.origin;
                importerSegments = url.pathname.split('/').filter(s => s !== '');
                // Remove the filename if it exists (keep directory path)
                if (!url.pathname.endsWith('/')) {
                    importerSegments.pop();
                }
                isImporterUrl = true;
            } catch {
                // Fallback if URL parsing fails
                importerSegments = importerDir.split('/').filter(s => s !== '');
            }
        } else {
            importerSegments = importerDir.split('/').filter(s => s !== '');
        }

        // Process each segment of the specifier
        for (const segment of segments) {
            if (segment === '.' || segment === '') {
                // Current directory, skip
                continue;
            } else if (segment === '..') {
                // Parent directory, pop from importer segments
                importerSegments.pop();
            } else {
                // Regular segment, add to path
                importerSegments.push(segment);
            }
        }

        // Reconstruct the path
        let result = importerSegments.join('/');

        // Handle URL vs path differently
        if (isImporterUrl) {
            // For URLs, combine origin with the resolved path
            const pathResult = '/' + result;
            try {
                return new URL(pathResult, importerOrigin).href;
            } catch {
                // If URL construction fails, return specifier as-is
                return specifier;
            }
        } else {
            // For regular paths, preserve leading slash if importer had one
            if (importer.startsWith('/') && !result.startsWith('/')) {
                result = '/' + result;
            }
            return result;
        }
    }

    #hasValidOrigin(url: string): boolean {
        // Match URLs with valid schemes, optional userinfo (username:password@), and origins
        // Format: scheme://[username[:password]@]host[:port][/path][?query][#fragment]
        const urlWithOriginRegex = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\/(?:[a-zA-Z\d._~!$&'()*+,;=%-]*(?::[a-zA-Z\d._~!$&'()*+,;=%-]*)?@)?[a-zA-Z\d.-]+(?::[0-9]+)?(?:\/.*)?$/;
        return urlWithOriginRegex.test(url);
    }

    #isBareSpecifier(specifier: string): boolean {
        // A bare specifier doesn't start with '/', './', '../', or contain a valid URL with origin
        return !specifier.startsWith('/') &&
            !this.#isRelativeURL(specifier) &&
            !this.#hasValidOrigin(specifier);
    }

    #isRelativeURL(specifier: string): boolean {
        return specifier.startsWith('./') || specifier.startsWith('../');
    }

    get valid() {
        return this.#validationResult.valid;
    }

    get validationResult() {
        return this.#validationResult;
    }
}

