# Validation Middleware Refactor (Tech Debt)

## Current State

Validation middleware across 5+ route files follows this pattern:

```js
schema.parse(req.query);  // parsed result is discarded
next();
```

This means the Zod `.coerce()`, `.default()`, and `.transform()` transformations are silently lost. The original untyped string values from `req.query` continue to the controller/service layer, requiring downstream `parseInt()`/`Number()` conversions in every paginated service.

## Affected Files

| File | Pattern | Type |
|---|---|---|
| `src/modules/branch/branch.routes.js:41` | Inline `querySchema.parse(req.query)` | Query |
| `src/modules/remaining/remaining.routes.js:23` | `validateQuery(schema).parse(req.query)` | Query |
| `src/modules/waste/waste.routes.js:22` | `validateQuery(schema).parse(req.query)` | Query |
| `src/modules/reports/reports.routes.js:9` | `validateQuery(schema).parse(req.query)` | Query |
| `src/modules/closure/closure.routes.js:22` | `validateQuery(schema).parse(req.query)` | Query |
| `src/utils/validation.js:20` | Shared `validate(schema).parse(req.body)` | Body |
| `src/modules/remaining/remaining.routes.js:9` | Local `validate(schema).parse(req.body)` | Body |
| `src/modules/waste/waste.routes.js:9` | Local `validate(schema).parse(req.body)` | Body |
| `src/modules/production/production.routes.js:9` | Local `validate(schema).parse(req.body)` | Body |
| `src/modules/product/product.routes.js:9` | Local `validate(schema).parse(req.body)` | Body |

## Recommended Fix

1. **Shared `validateQuery` middleware** — Extract to `src/utils/validation.js`:

```js
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid query parameters', errors: error.errors });
  }
};
```

2. **Shared `validate` middleware** — Update to assign parsed result:

```js
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
  }
};
```

3. **Consolidate** — Replace all 5 local `validateQuery` definitions with the shared import.

4. **Remove duplicated `validate`** — Replace remaining local `validate` definitions with the shared utility.

## Risk

- Requires regression testing on all endpoints with `page`/`limit` params
- Some existing `parseInt()` in services would become redundant but not harmful
- Must ensure `req.body` mutation doesn't break any downstream middlewares
