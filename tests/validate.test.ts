import { describe, it, expect } from 'vitest';
import { td } from './utils.js';
import { validate } from '../src/validate.js';
import type { ImportMap } from '../src/types.js';

describe('validate', () => {
    describe('basic validation', () => {
        it(td('Should return valid result for empty import map.'), () => {
            const result = validate({});
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it(td('Should return invalid result for null input.'), () => {
            const result = validate(null as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import map must be an object.');
        });

        it(td('Should return invalid result for undefined input.'), () => {
            const result = validate(undefined as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import map must be an object.');
        });

        [            
            { input: 'string', type: 'string' },
            { input: 123, type: 'number' },
            { input: true, type: 'boolean' }
        ].forEach(({ input, type }) => {
            it(td(`Should return invalid result for ${type} input.`), () => {
                const result = validate(input as any);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Import map must be an object.');
            });
        });

        it(td('Should return invalid result for array input.'), () => {
            const result = validate([] as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import map must be a plain object (not a class instance, Date, Array, etc.).');
        });

        [
            { input: new Date(), name: 'Date instance' },
            { input: new Set(), name: 'Set instance' },
            { input: new Map(), name: 'Map instance' },
            { input: /regex/, name: 'RegExp instance' }
        ].forEach(({ input, name }) => {
            it(td(`Should return invalid result for ${name}.`), () => {
                const result = validate(input as any);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Import map must be a plain object (not a class instance, Date, Array, etc.).');
            });
        });
    });

    describe('imports section validation', () => {
        it(td('Should return valid result for valid imports section.'), () => {
            const importMap: ImportMap = {
                imports: {
                    'react': 'https://esm.sh/react@18',
                    'lodash': 'https://cdn.skypack.dev/lodash',
                    'utils/': './lib/',
                    './local': './src/local.js'
                }
            };
            const result = validate(importMap);
            expect(result.valid).to.be.true;
            expect(result.errors).toHaveLength(0);
        });

        [
            { imports: null, description: 'null imports' },
            { imports: 'string', description: 'string imports' },
            { imports: 123, description: 'number imports' }
        ].forEach(({ imports, description }) => {
            it(td(`Should return invalid result for ${description}.`), () => {
                const importMap = { imports } as any;
                const result = validate(importMap);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('The "ImportMap.imports" field must be an object.');
            });
        });

        it(td('Should return invalid result for array imports.'), () => {
            const importMap = { imports: [] } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.imports" field must be a plain object.');
        });

        it(td('Should return invalid result for non-plain object imports.'), () => {
            const importMap = { imports: new Date() } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.imports" field must be a plain object.');
        });

        it(td('Should return invalid result for empty specifier.'), () => {
            const importMap: ImportMap = {
                imports: { '': 'https://example.com' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import specifier cannot be empty.');
        });

        it(td('Should return invalid result for empty address.'), () => {
            const importMap: ImportMap = {
                imports: { 'react': '' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import address for "react" cannot be empty.');
        });

        it(td('Should return invalid result for non-string address.'), () => {
            const importMap = {
                imports: { 'react': 123 }
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import address for "react" must be a string.');
        });

        it(td('Should return invalid result for malformed URL address.'), () => {
            const importMap: ImportMap = {
                imports: { 'react': 'http://[::1::invalid' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('appears to be a malformed URL'))).toBe(true);
        });

        it(td('Should return invalid result for trailing slash mismatch.'), () => {
            const importMap: ImportMap = {
                imports: { 'utils/': './lib' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Import specifier "utils/" ends with "/" but address "./lib" does not.');
        });

        it(td('Should return invalid result for address with invisible Unicode characters.'), () => {
            const importMap: ImportMap = {
                imports: { 'test': 'https://example.com/test\u200B.js' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('contains invisible or zero-width Unicode characters'))).toBe(true);
        });

        it(td('Should return invalid result for address with bidirectional text control characters.'), () => {
            const importMap: ImportMap = {
                imports: { 'test': 'https://example.com/\u202Atest\u202C.js' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('contains bidirectional text control characters'))).toBe(true);
        });

        it(td('Should return invalid result for address with mixed scripts.'), () => {
            const importMap: ImportMap = {
                imports: { 'test': 'https://exаmple.com/test.js' }  // contains Cyrillic 'а'
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('contains mixed scripts'))).toBe(true);
        });

        it(td('Should return invalid result for address with suspicious homograph characters.'), () => {
            const importMap: ImportMap = {
                imports: { 'test': 'https://exаmple.com/test.js' }  // 'а' is Cyrillic, not Latin
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('looks like \'a\' but is a different Unicode character'))).toBe(true);
        });
    });

    describe('scopes section validation', () => {
        it(td('Should return valid result for valid scopes section.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    '/app/': {
                        'utils': './lib/utils.js',
                        'react': 'https://esm.sh/react@18'
                    },
                    'https://example.com/': {
                        'lodash': 'https://cdn.skypack.dev/lodash'
                    }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        [
            { scopes: null, description: 'null scopes' },
            { scopes: 'string', description: 'string scopes' },
            { scopes: 123, description: 'number scopes' }
        ].forEach(({ scopes, description }) => {
            it(td(`Should return invalid result for ${description}.`), () => {
                const importMap = { scopes } as any;
                const result = validate(importMap);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('The "ImportMap.scopes" field must be an object.');
            });
        });

        it(td('Should return invalid result for array scopes.'), () => {
            const importMap = { scopes: [] } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.scopes" field must be a plain object.');
        });

        it(td('Should return invalid result for non-plain object scopes.'), () => {
            const importMap = { scopes: new Date() } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.scopes" field must be a plain object.');
        });

        it(td('Should return invalid result for empty scope prefix.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    '': { 'utils': './lib/utils.js' }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The scope object must not define an empty scope prefix.');
        });

        it(td('Should return invalid result for malformed URL scope prefix.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    'http://[::1::invalid': { 'utils': './lib/utils.js' }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('appears to be a malformed URL'))).toBe(true);
        });

        [
            { scopeImports: null, description: 'null scope imports' },
            { scopeImports: 'string', description: 'string scope imports' },
            { scopeImports: 123, description: 'number scope imports' }
        ].forEach(({ scopeImports, description }) => {
            it(td(`Should return invalid result for ${description}.`), () => {
                const importMap = {
                    scopes: { '/app/': scopeImports }
                } as any;
                const result = validate(importMap);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Scope imports for "/app/" must be an object.');
            });
        });

        it(td('Should return invalid result for array scope imports.'), () => {
            const importMap = {
                scopes: { '/app/': [] }
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scope imports for "/app/" must be a plain object.');
        });

        it(td('Should return invalid result for non-plain object scope imports.'), () => {
            const importMap = {
                scopes: { '/app/': new Date() }
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scope imports for "/app/" must be a plain object.');
        });

        it(td('Should return invalid result for empty scoped specifier.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    '/app/': { '': 'https://example.com' }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scoped import specifier in scope "/app/" cannot be empty.');
        });

        it(td('Should return invalid result for empty scoped address.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    '/app/': { 'react': '' }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scoped import address for "react" in scope "/app/" cannot be empty.');
        });

        it(td('Should return invalid result for non-string scoped address.'), () => {
            const importMap = {
                scopes: {
                    '/app/': { 'react': 123 }
                }
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scoped import address for "react" in scope "/app/" must be a string.');
        });

        it(td('Should return invalid result for scoped trailing slash mismatch.'), () => {
            const importMap: ImportMap = {
                scopes: {
                    '/app/': { 'utils/': './lib' }
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Scoped import specifier "utils/" in scope "/app/" ends with "/" but address "./lib" does not.');
        });
    });

    describe('integrity section validation', () => {
        it(td('Should return valid result for valid integrity section.'), () => {
            const importMap: ImportMap = {
                integrity: {
                    'https://esm.sh/react@18': 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
                    'https://cdn.skypack.dev/lodash': 'sha256-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v',
                    '/lib/utils.js': 'sha512-abcdef1234567890'
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        [
            { integrity: null, description: 'null integrity' },
            { integrity: 'string', description: 'string integrity' },
            { integrity: 123, description: 'number integrity' }
        ].forEach(({ integrity, description }) => {
            it(td(`Should return invalid result for ${description}.`), () => {
                const importMap = { integrity } as any;
                const result = validate(importMap);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('The "ImportMap.integrity" field must be an object.');
            });
        });

        it(td('Should return invalid result for array integrity.'), () => {
            const importMap = { integrity: [] } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.integrity" field must be a plain object.');
        });

        it(td('Should return invalid result for non-plain object integrity.'), () => {
            const importMap = { integrity: new Date() } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('The "ImportMap.integrity" field must be a plain object.');
        });

        it(td('Should return invalid result for empty integrity URL.'), () => {
            const importMap: ImportMap = {
                integrity: { '': 'sha384-abc123' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Integrity URL cannot be empty.');
        });

        it(td('Should return invalid result for invalid integrity URL.'), () => {
            const importMap: ImportMap = {
                integrity: { 'http://[invalid': 'sha384-abc123' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('is not a valid URL'))).toBe(true);
        });

        it(td('Should return invalid result for non-string integrity value.'), () => {
            const importMap = {
                integrity: { 'https://example.com': 123 }
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Integrity value for "https://example.com" must be a string.');
        });

        it(td('Should return invalid result for empty integrity value.'), () => {
            const importMap: ImportMap = {
                integrity: { 'https://example.com': '' }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('cannot be empty'))).toBe(true);
        });

        [
            { value: 'invalid-hash', description: 'invalid hash format' },
            { value: 'sha256-', description: 'empty hash' },
            { value: 'md5-abc123', description: 'unsupported algorithm' },
            { value: 'sha256-invalid!chars', description: 'invalid base64 characters' }
        ].forEach(({ value, description }) => {
            it(td(`Should return invalid result for ${description} integrity value.`), () => {
                const importMap: ImportMap = {
                    integrity: { 'https://example.com': value }
                };
                const result = validate(importMap);
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('is not a valid subresource integrity hash'))).toBe(true);
            });
        });

        it(td('Should return valid result for multiple integrity values.'), () => {
            const importMap: ImportMap = {
                integrity: { 
                    'https://example.com': 'sha256-abc123 sha384-def456 sha512-ghi789' 
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it(td('Should return invalid result for integrity URL with Unicode security issues.'), () => {
            const importMap: ImportMap = {
                integrity: { 'https://exаmple.com/test.js': 'sha384-abc123' }  // Cyrillic 'а'
            };
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('mixed scripts'))).toBe(true);
        });
    });

    describe('unknown keys validation', () => {
        it(td('Should return invalid result for unknown top-level key "custom".'), () => {
            const importMap = {
                imports: { 'react': 'https://esm.sh/react@18' },
                custom: 'unknown property'
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown import map key: "custom"');
        });

        it(td('Should return invalid result for multiple unknown top-level keys.'), () => {
            const importMap = {
                imports: { 'react': 'https://esm.sh/react@18' },
                custom1: 'unknown',
                custom2: 'also unknown'
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown import map key: "custom1"');
            expect(result.errors).toContain('Unknown import map key: "custom2"');
        });
    });

    describe('edge cases and complex scenarios', () => {
        it(td('Should return valid result for import map with all valid sections.'), () => {
            const importMap: ImportMap = {
                imports: {
                    'react': 'https://esm.sh/react@18',
                    'utils/': './lib/'
                },
                scopes: {
                    '/app/': {
                        'lodash': 'https://cdn.skypack.dev/lodash'
                    }
                },
                integrity: {
                    'https://esm.sh/react@18': 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K'
                }
            };
            const result = validate(importMap);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it(td('Should accumulate all validation errors in single result.'), () => {
            const importMap = {
                imports: { '': '' },  // empty specifier and address
                scopes: { '': { '': '' } },  // empty scope prefix and scoped specifier/address
                integrity: { '': '' },  // empty URL and value
                unknown: 'invalid'  // unknown key
            } as any;
            const result = validate(importMap);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(8);
        });

        it(td('Should handle import map with only undefined values.'), () => {
            const importMap: ImportMap = {
                imports: undefined,
                scopes: undefined,
                integrity: undefined
            };
            const result = validate(importMap);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});