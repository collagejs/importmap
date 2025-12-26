import { describe, it, beforeEach, expect } from 'vitest';
import { ResolverImpl } from '../src/ResolverImpl.js';
import type { ImportMap } from '../src/types.js';
import { td } from './utils.js';

describe('ResolverImpl', () => {
    let validImportMap: ImportMap;
    let invalidImportMap: ImportMap;

    beforeEach(() => {
        validImportMap = {
            imports: {
                'react': 'https://esm.sh/react@18',
                'react/': 'https://esm.sh/react@18/',
                'lodash': 'https://cdn.skypack.dev/lodash',
                'utils': '/lib/utils.js',
                '@my/package': './local/package.js',
                // Test absolute URL remapping
                'https://example.com/old-lib.js': 'https://cdn.com/new-lib.js',
                'https://example.com/legacy/': 'https://cdn.com/modern/',
                'https://unpkg.com/react@17/': 'https://esm.sh/react@18/',
                // Test absolute path remapping
                '/old/lib.js': '/new/lib.js',
                '/legacy/': '/modern/',
                '/system/utils.js': 'https://cdn.com/system-utils.js'
            },
            scopes: {
                'https://example.com/': {
                    'react': 'https://esm.sh/react@17',
                    'utils': '/scoped/utils.js'
                },
                '/admin/': {
                    'react': 'https://cdn.com/react-admin.js'
                }
            }
        };

        invalidImportMap = {
            imports: {
                '': 'https://invalid.com', // Empty specifier
                'test': '' // Empty address
            }
        };
    });

    describe('constructor', () => {
        it(td('Should create a resolver with a valid import map containing imports and scopes.'), () => {
            const resolver = new ResolverImpl(validImportMap);
            expect(resolver.valid).toBe(true);
            expect(resolver.validationResult.valid).toBe(true);
            expect(resolver.validationResult.errors).toHaveLength(0);
        });

        it(td('Should create a resolver with an invalid import map but mark it as invalid.'), () => {
            const resolver = new ResolverImpl(invalidImportMap);
            expect(resolver.valid).toBe(false);
            expect(resolver.validationResult.valid).toBe(false);
            expect(resolver.validationResult.errors.length).toBeGreaterThan(0);
        });
    });

    describe('resolve() - basic functionality', () => {
        let resolver: ResolverImpl;

        beforeEach(() => {
            resolver = new ResolverImpl(validImportMap);
        });

        it(td('Should throw an error when resolving with invalid import map.'), () => {
            const invalidResolver = new ResolverImpl(invalidImportMap);
            expect(() => invalidResolver.resolve('test')).toThrow();
        });

        const exactMatchCases = [
            { specifier: 'react', expected: 'https://esm.sh/react@18' },
            { specifier: 'lodash', expected: 'https://cdn.skypack.dev/lodash' },
            { specifier: 'utils', expected: '/lib/utils.js' },
            { specifier: '@my/package', expected: './local/package.js' }
        ];
        exactMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve exact match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const prefixMatchCases = [
            { specifier: 'react/jsx-runtime', expected: 'https://esm.sh/react@18/jsx-runtime' },
            { specifier: 'react/hooks', expected: 'https://esm.sh/react@18/hooks' },
            { specifier: 'react/dom/client', expected: 'https://esm.sh/react@18/dom/client' }
        ];
        prefixMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve prefix match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const unresolvedBareSpecifierCases = [
            { specifier: 'unknown-package' },
            { specifier: 'not-found' },
            { specifier: 'missing-module' },
            { specifier: '@unregistered/package' }
        ];
        unresolvedBareSpecifierCases.forEach(({ specifier }) => {
            it(td(`Should return undefined for unresolved bare specifier "${specifier}".`), () => {
                expect(resolver.resolve(specifier)).toBeUndefined();
            });
        });

        const absoluteUrlExactMatchCases = [
            { specifier: 'https://example.com/old-lib.js', expected: 'https://cdn.com/new-lib.js' }
        ];
        absoluteUrlExactMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve absolute URL exact match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const absoluteUrlPrefixMatchCases = [
            { specifier: 'https://example.com/legacy/utils.js', expected: 'https://cdn.com/modern/utils.js' },
            { specifier: 'https://unpkg.com/react@17/jsx-runtime', expected: 'https://esm.sh/react@18/jsx-runtime' }
        ];
        absoluteUrlPrefixMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve absolute URL prefix match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const unmappedAbsoluteUrlCases = [
            { url: 'https://other.com/module.js' },
            { url: 'http://different-cdn.com/lib.js' },
            { url: 'https://unpkg.com/different@18/index.js' }
        ];
        unmappedAbsoluteUrlCases.forEach(({ url }) => {
            it(td(`Should return unmapped absolute URL as-is: "${url}".`), () => {
                expect(resolver.resolve(url)).toBe(url);
            });
        });

        const absolutePathExactMatchCases = [
            { specifier: '/old/lib.js', expected: '/new/lib.js' },
            { specifier: '/system/utils.js', expected: 'https://cdn.com/system-utils.js' }
        ];
        absolutePathExactMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve absolute path exact match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const absolutePathPrefixMatchCases = [
            { specifier: '/legacy/helper.js', expected: '/modern/helper.js' },
            { specifier: '/legacy/components/button.js', expected: '/modern/components/button.js' }
        ];
        absolutePathPrefixMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should resolve absolute path prefix match: "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });

        const unmappedAbsolutePathCases = [
            { path: '/some/absolute/path.js' },
            { path: '/unmapped/utils.js' },
            { path: '/node_modules/package/index.js' }
        ];
        unmappedAbsolutePathCases.forEach(({ path }) => {
            it(td(`Should return unmapped absolute path as-is: "${path}".`), () => {
                expect(resolver.resolve(path)).toBe(path);
            });
        });
    });

    describe('resolve() - scoped resolution', () => {
        let resolver: ResolverImpl;

        beforeEach(() => {
            resolver = new ResolverImpl(validImportMap);
        });

        const scopedImportCases = [
            { specifier: 'react', importer: 'https://example.com/app.js', expected: 'https://esm.sh/react@17' },
            { specifier: 'utils', importer: 'https://example.com/main.js', expected: '/scoped/utils.js' }
        ];
        scopedImportCases.forEach(({ specifier, importer, expected }) => {
            it(td(`Should use scoped import for "${specifier}" when importer "${importer}" matches scope → "${expected}".`), () => {
                expect(resolver.resolve(specifier, importer)).toBe(expected);
            });
        });

        it(td('Should use scoped import for directory-based scope: "react" from "/admin/dashboard.js" → "https://cdn.com/react-admin.js".'), () => {
            expect(resolver.resolve('react', '/admin/dashboard.js')).toBe('https://cdn.com/react-admin.js');
        });

        const fallbackCases = [
            { specifier: 'react', importer: 'https://other.com/app.js', expected: 'https://esm.sh/react@18' },
            { specifier: 'lodash', importer: '/admin/test.js', expected: 'https://cdn.skypack.dev/lodash' }
        ];
        fallbackCases.forEach(({ specifier, importer, expected }) => {
            it(td(`Should fall back to global import for "${specifier}" when importer "${importer}" doesn't match scope → "${expected}".`), () => {
                expect(resolver.resolve(specifier, importer)).toBe(expected);
            });
        });

        it(td('Should prefer most specific scope match: "/app/admin/panel.js" uses "/app/admin/" scope over "/app/" scope.'), () => {
            const mapWithNestedScopes: ImportMap = {
                imports: {
                    'lib': 'https://global.com/lib'
                },
                scopes: {
                    '/app/': {
                        'lib': 'https://app.com/lib'
                    },
                    '/app/admin/': {
                        'lib': 'https://admin.com/lib'
                    }
                }
            };
            
            const scopedResolver = new ResolverImpl(mapWithNestedScopes);
            expect(scopedResolver.resolve('lib', '/app/admin/panel.js')).toBe('https://admin.com/lib');
            expect(scopedResolver.resolve('lib', '/app/main.js')).toBe('https://app.com/lib');
        });
    });

    describe('resolve() - relative path resolution', () => {
        let resolver: ResolverImpl;

        beforeEach(() => {
            resolver = new ResolverImpl({});
        });

        const relativePathCases = [
            { specifier: './utils.js', importer: '/app/main.js', expected: '/app/utils.js' },
            { specifier: '../lib/helper.js', importer: '/app/components/button.js', expected: '/app/lib/helper.js' }
        ];
        relativePathCases.forEach(({ specifier, importer, expected }) => {
            it(td(`Should resolve relative path "${specifier}" with path importer "${importer}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier, importer)).toBe(expected);
            });
        });

        const urlImporterCases = [
            { specifier: './utils.js', importer: 'https://example.com/app/main.js', expected: 'https://example.com/app/utils.js' },
            { specifier: '../lib/helper.js', importer: 'https://cdn.com/app/components/button.js', expected: 'https://cdn.com/app/lib/helper.js' }
        ];
        urlImporterCases.forEach(({ specifier, importer, expected }) => {
            it(td(`Should resolve relative path "${specifier}" with URL importer "${importer}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier, importer)).toBe(expected);
            });
        });

        const complexRelativePathCases = [
            { specifier: './../../shared/utils.js', importer: '/app/features/auth/login.js', expected: '/app/shared/utils.js' },
            { specifier: './../../../root.js', importer: '/deep/nested/folder/file.js', expected: '/root.js' }
        ];
        complexRelativePathCases.forEach(({ specifier, importer, expected }) => {
            it(td(`Should handle complex relative path "${specifier}" with importer "${importer}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier, importer)).toBe(expected);
            });
        });

        const noImporterCases = [
            { specifier: './utils.js' },
            { specifier: '../lib/helper.js' }
        ];
        noImporterCases.forEach(({ specifier }) => {
            it(td(`Should return relative specifier "${specifier}" as-is when no importer provided.`), () => {
                expect(resolver.resolve(specifier)).toBe(specifier);
            });
        });
    });

    describe('resolve() - resolution priority', () => {
        let resolver: ResolverImpl;

        beforeEach(() => {
            const mapWithPriorities: ImportMap = {
                imports: {
                    'test': 'https://global.com/test',
                    'test/': 'https://global.com/test/',
                    'test/sub': 'https://global.com/test-sub-exact'
                },
                scopes: {
                    '/app/': {
                        'test': 'https://scoped.com/test',
                        'test/sub': 'https://scoped.com/test-sub-exact'
                    }
                }
            };
            resolver = new ResolverImpl(mapWithPriorities);
        });

        it(td('Should prioritize scopes over global imports: "test" with importer "/app/main.js" → "https://scoped.com/test".'), () => {
            expect(resolver.resolve('test', '/app/main.js')).toBe('https://scoped.com/test');
        });

        it(td('Should prioritize longer/more specific matches: "test/sub" matches "test/sub" (8 chars) over "test/" (5 chars).'), () => {
            expect(resolver.resolve('test/sub', '/app/main.js')).toBe('https://scoped.com/test-sub-exact');
            expect(resolver.resolve('test/sub')).toBe('https://global.com/test-sub-exact');
        });

        it(td('Should use prefix matches when no exact match found: "test/other" → "https://global.com/test/other".'), () => {
            expect(resolver.resolve('test/other', '/app/main.js')).toBe('https://global.com/test/other');
        });

        it(td('Should prioritize longer prefix over shorter exact match when both could apply.'), () => {
            const mapWithLengthPriority: ImportMap = {
                imports: {
                    'lib': 'https://short-exact.com/lib',  // exact match, length 3
                    'lib/utils/': 'https://long-prefix.com/lib/utils/'  // prefix match, length 11
                }
            };
            const resolver = new ResolverImpl(mapWithLengthPriority);
            
            // "lib/utils/helper.js" should match "lib/utils/" (11 chars) not "lib" (3 chars)
            expect(resolver.resolve('lib/utils/helper.js')).toBe('https://long-prefix.com/lib/utils/helper.js');
            
            // But "lib" should still match the exact "lib" when no longer match exists
            expect(resolver.resolve('lib')).toBe('https://short-exact.com/lib');
        });
    });

    describe('resolve() - longest match priority', () => {
        let resolver: ResolverImpl;

        beforeEach(() => {
            const mapWithLengths: ImportMap = {
                imports: {
                    'lib': 'https://short.com/lib',
                    'lib/': 'https://medium.com/lib/',
                    'lib/components': 'https://long.com/lib-components',
                    'lib/components/': 'https://longest.com/lib-components/'
                }
            };
            resolver = new ResolverImpl(mapWithLengths);
        });

        const longestMatchCases = [
            { specifier: 'lib', expected: 'https://short.com/lib' },
            { specifier: 'lib/utils', expected: 'https://medium.com/lib/utils' },
            { specifier: 'lib/components', expected: 'https://long.com/lib-components' },
            { specifier: 'lib/components/button', expected: 'https://longest.com/lib-components/button' }
        ];
        longestMatchCases.forEach(({ specifier, expected }) => {
            it(td(`Should use the longest matching key for "${specifier}" → "${expected}".`), () => {
                expect(resolver.resolve(specifier)).toBe(expected);
            });
        });
    });

    describe('edge cases', () => {
        const emptyImportMapCases = [
            { importMap: {} },
            { importMap: { imports: {} } },
            { importMap: { scopes: {} } },
            { importMap: { imports: {}, scopes: {} } },
            { importMap: { integrity: {} } },
            { importMap: { imports: {}, integrity: {} } },
            { importMap: { scopes: {}, integrity: {} } },
            { importMap: { imports: {}, scopes: {}, integrity: {} } }
        ];
        emptyImportMapCases.forEach(({ importMap }) => {
            it(td(`Should handle empty import map ${JSON.stringify(importMap)} gracefully.`), () => {
                const resolver = new ResolverImpl(importMap as ImportMap);
                expect(resolver.valid).toBe(true);
                expect(resolver.resolve('anything')).toBeUndefined();
            });
        });

        it(td('Should handle import map with only imports: { imports: { "test": "/test.js" } }.'), () => {
            const resolver = new ResolverImpl({ imports: { 'test': '/test.js' } });
            expect(resolver.resolve('test')).toBe('/test.js');
        });

        it(td('Should handle import map with only scopes: { scopes: { "/app/": { "test": "/scoped.js" } } }.'), () => {
            const resolver = new ResolverImpl({ 
                scopes: { 
                    '/app/': { 'test': '/scoped.js' } 
                } 
            });
            expect(resolver.resolve('test', '/app/main.js')).toBe('/scoped.js');
            expect(resolver.resolve('test')).toBeUndefined();
        });

        it(td('Should handle malformed importer URL gracefully: "./test.js" with importer "not-a-url".'), () => {
            const resolver = new ResolverImpl({});
            // Should not throw, should return the relative specifier as-is
            expect(resolver.resolve('./test.js', 'not-a-url')).toBe('./test.js');
        });
    });

    describe('properties', () => {
        it(td('Should expose valid property correctly: true for valid import maps, false for invalid ones.'), () => {
            const validResolver = new ResolverImpl(validImportMap);
            const invalidResolver = new ResolverImpl(invalidImportMap);
            
            expect(validResolver.valid).toBe(true);
            expect(invalidResolver.valid).toBe(false);
        });

        it(td('Should expose validationResult property with valid flag and errors array.'), () => {
            const validResolver = new ResolverImpl(validImportMap);
            const invalidResolver = new ResolverImpl(invalidImportMap);
            
            expect(validResolver.validationResult.valid).toBe(true);
            expect(validResolver.validationResult.errors).toHaveLength(0);
            
            expect(invalidResolver.validationResult.valid).toBe(false);
            expect(invalidResolver.validationResult.errors.length).toBeGreaterThan(0);
        });
    });
});

