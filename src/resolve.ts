import type { ImportMap, Resolver } from './types.js';
import { ResolverImpl } from './Resolver.js';

/**
 * Creates a resolver object from an import map.
 * @param importMap Input import map to use for module identifier resolution.
 * @returns An object of type `Resolver` ready to resolve module identifiers.
 */
export function resolver(importMap: ImportMap): Resolver {
    return new ResolverImpl(importMap);
}
