import { describe, it, expect } from 'vitest';
import { td } from './utils.js';
import { resolver } from '../src/resolver.js';
import type { ImportMap } from '../src/types.js';

describe('resolver', () => {
    const testCases = [
        {
            name: 'empty import map',
            importMap: {} as ImportMap,
            expectedValid: true
        },
        {
            name: 'import map with imports only',
            importMap: { 
                imports: { 
                    'react': 'https://esm.sh/react@18',
                    'lodash': 'https://cdn.skypack.dev/lodash'
                }
            } as ImportMap,
            expectedValid: true
        },
        {
            name: 'import map with scopes only', 
            importMap: {
                scopes: {
                    '/app/': {
                        'utils': './lib/utils.js'
                    }
                }
            } as ImportMap,
            expectedValid: true
        },
        {
            name: 'import map with all sections',
            importMap: {
                imports: { 'react': 'https://esm.sh/react@18' },
                scopes: { '/app/': { 'utils': './lib/utils.js' } },
                integrity: { 'https://esm.sh/react@18': 'sha384-abc123' }
            } as ImportMap,
            expectedValid: true
        },
        {
            name: 'invalid import map (null)',
            importMap: null as any,
            expectedValid: false
        },
        {
            name: 'invalid import map (string)',
            importMap: 'not an object' as any,
            expectedValid: false
        }
    ];

    testCases.forEach(({ name, importMap, expectedValid }) => {
        it(td(`Should create resolver instance for ${name} with valid=${expectedValid}.`), () => {
            const result = resolver(importMap);
            
            expect(result).toBeDefined();
            expect(result.valid).toBe(expectedValid);
            expect(typeof result.resolve).toBe('function');
            expect(result.validationResult).toBeDefined();
        });
    });

    it(td('Should return resolver with resolve method that accepts specifier and optional importer.'), () => {
        const importMap: ImportMap = { 
            imports: { 'react': 'https://esm.sh/react@18' }
        };
        const result = resolver(importMap);
        
        // Test that resolve method exists and can be called
        expect(() => result.resolve('react')).not.toThrow();
        expect(() => result.resolve('react', '/src/app.js')).not.toThrow();
    });

    it(td('Should return resolver instance that maintains import map state.'), () => {
        const importMap: ImportMap = { 
            imports: { 'test-package': 'https://example.com/test.js' }
        };
        const result = resolver(importMap);
        
        // Verify the resolver can actually resolve based on the provided import map
        expect(result.resolve('test-package')).toBe('https://example.com/test.js');
    });
});