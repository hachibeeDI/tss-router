# Defining routes

Routes are built with the fluent `route(...)` factory and the `.at(...)`
method on the resulting router. Each call adds a route and refines the
router's type so that downstream consumers (links, navigate hooks) know
about the new entry.

## Starting a router

```ts
import {route} from 'tss-route-lib';

const router = route('home', '/', () => <div>Home</div>);
```

`route(key, path, render)` accepts:

| Param | Description |
| --- | --- |
| `key` | A string identifier for this route. Used by `<Link route="...">` and `useNavigate('...')`. |
| `path` | The path pattern. May contain `:placeholder` segments and a `?key=alias` query template. |
| `render` | A function `(params) => ReactNode` that renders the route. |

## Adding more routes

Chain `.at(...)` calls. The router's type accumulates with each call.

```ts
const router = route('home', '/', () => <div>Home</div>)
  .at('user', '/users/:id', (params) => <div>User {params.id}</div>)
  .at('admin', '/admin', () => <div>Admin</div>);
```

`.at(key, path, render)` mirrors `route(...)` and returns the same router for
chaining. The `key` must be unique within the router.

## Route resolution

When `useRouter(router)` evaluates the current location, it looks through the
routings in registration order and picks the first route whose `match`
returns true. **There is no deepest-match heuristic** — order matters.

```ts
// /users/me will resolve to `detail` because it was registered first.
route('detail', '/users/:id', (p) => <div>{p.id}</div>)
  .at('me', '/users/me', () => <div>That's you</div>);
```

If the order is wrong for your case, register more specific routes first.

## When no route matches

By default, `router.render(location)` throws `LocationNotFoundError` and the
`useRouter` hook re-throws it during render. Two ways to handle this:

### `.fallback(render)` — register a not-found view inline

```tsx
const router = route('home', '/', () => <div>Home</div>)
  .at('user', '/users/:id', (p) => <div>User {p.id}</div>)
  .fallback((loc) => <NotFound pathname={loc.pathname} />);
```

When `fallback` is set, the router renders it instead of throwing. The
callback receives the current `Location`, so you can read `pathname` /
`search` / `state` from the unmatched URL.

This is the recommended approach for most apps.

::: info Group-level fallback
Currently `.fallback` lives on the top-level router. A group-scoped
fallback (matching the group's prefix but none of its routes) isn't
shipped yet — open an issue if you need it.
:::

### Error boundary — when you want to share handling with other render-time errors

If you'd rather treat "not found" like any other thrown error, skip
`fallback` and catch it explicitly:

```tsx
import {isLocationNotFoundError} from 'tss-route-lib';

try {
  return router.render(location);
} catch (err) {
  if (isLocationNotFoundError(err)) {
    return <NotFound />;
  }
  throw err;
}
```

## Tips

- **Pick stable keys.** Keys are part of your call sites (`<Link route="user">`).
  Treat them like exported names.
- **Keep render functions small.** They run on every navigation; if a route
  needs serious composition, render a normal component from inside.
- **Don't put logic in the path.** Patterns like dynamic regex aren't
  supported — use a placeholder and validate inside the render function.
