import type { ImportMap, Resolver } from './types.js';
import { ResolverImpl } from './Resolver.js';

export function resolver(importMap: ImportMap): Resolver {
    return new ResolverImpl(importMap);
}
