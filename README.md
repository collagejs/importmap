# <img src="https://raw.githubusercontent.com/collagejs/core/HEAD/src/logos/collagejs-48.svg" alt="CollageJS Logo" width="48" height="48" align="left">&nbsp;Importmap

This is the home of `@collagejs/importmap`, an NPM package that validates import maps and resolves modules according to the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap).

## Quickstart

1. Install the package:
    ```bash
    npm install @collagejs/importmap
    ```
2. Create a resolver object:
    ```typescript
    import { resolver, type ImportMap, type Resolver } from "@collagejs/importmap";

    const myMap: ImportMap = obtainMyImportMapSomehow();
    const imResolver = resolver(myMap);
    ```
3. Use the resolver to resolve module specifiers.  If the `importer` parameter is not given, resolution cannot use the `scopes` rules of the import map:
    ```typescript
    const resolvedUrl = imResolver.resolve('@my/bare-specifier', '/legacy');
    // ------------------------------------^ module specifier ---^ importer
    ```

## Importmap Validation

Validation happens in 2 places:  When creating a resolver, and when explicitly validating an import map:

```typescript
import { resolver, validate, type ValidationResult } from "@collagejs/importmap";

// A Resolver object validates an import map upon construction:
const imResolver = resolver(myImportMap);
console.log('My import map is %s.', imResolver.valid ? 'valid' : 'invalid');

// Directly validating an import map:
const validationResult = validate(myImportMap); // of type ValidationResult
if (!validationResult.valid) {
  let msg = `The import map failed validation and has reported ${validationResult.errors.length} error(s):`;
  for (const e of validationResult.errors) {
    msg += `\n  ❌ ${e}`
  }
  console.warn(msg);
}
```

> ⚠️ **IMPORTANT**:  A resolver that holds an invalid import map will throw an error if module resolution is attempted.  Always check for `Resolver.valid` (or `Resolver.validationResult.valid`).

## Resolution Return Values

This package adheres as best it can to the expected module resolution mechanism, but for the sake of practicality, it does a couple of things users might not expect.  Read this section to fully understand the return value of `Resolver.resolve()`.

If the provided module specifier matches (either in scopes or global imports), then the value in the import map entry that matched will be returned.  So far, this is standard.

In the cases where no match is found and the provided module specifier was:

- A relative URL (starts with `./` or `../`)
- An absolute URL (starts with `/`)
- A full URL

Then the module identifier is returned.  A special case happens for relative URL's when an importer that is a URL is provided.  In this case, the relative URL represented by the module identifier is resolved against the importer and the result is returned.

Example:

```typescript
const resolved = resolver.resolve('../my/module', '/base-app');
console.log(resolved);
/*
------ OUTPUT ------
/my/module
*/
```

Since the relative URL has consumed (popped) one URL segment, the importer value has provided that segment and the end result is an absolute URL.

## Related Packages

+ `@jspm/import-map`: [NPM](https://www.npmjs.com/package/@jspm/import-map) Provides import map building via code and module resolution.  Does not provide validation.
