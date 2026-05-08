# API Reference

Everything below is exported from `tss-route-lib`.

## `route(key, path, render)`

Creates a new router with a single route.

```ts
function route<Key extends string, Path extends string>(
  key: Key,
  path: Path,
  render: (params: PathParser<Path>) => ReactNode,
): Router<Record<Key, Routing<Path>>>;
```

## `Router<R>`

The router instance returned from `route(...)`. Most methods return the
router for chaining; their type signatures expand the routing map so
TypeScript can track available routes.

### `.at(key, path, render)`

Adds a route. `key` must be unique within the router.

```ts
router.at('user', '/users/:id', (params) => <div>{params.id}</div>);
```

### `.group(keyPrefix, pathPrefix, render | {layout, render})`

Adds a set of routes that share a key/path prefix and (optionally) a layout
component.

Function form:

```ts
router.group('admin/', '/admin', (g) =>
  g.at('dashboard', '/', () => <div>Dashboard</div>),
);
```

Object form (with layout):

```ts
router.group('users/', '/users/:userId', {
  layout: (ctx, params, children) => <UserShell ctx={ctx} userId={params.userId}>{children}</UserShell>,
  render: (g) => g.at('profile', '/profile', (p) => <Profile id={p.userId} />, {/* ctx */}),
});
```

### `.buildUrl(key, params)`

Builds a URL string for `key`, encoding path placeholders and serializing
`$search` via `URLSearchParams`. Throws if `key` is unknown.

### `.render(location)`

Resolves the registered route for `location.pathname` and returns a
`ReactNode`. Throws `LocationNotFoundError` when no route matches.

## `routingHooksFactory(router)`

Returns components and hooks bound to the router's types.

```ts
const {Link, useNavigate, useRedirect} = routingHooksFactory(router);
```

### `Link`

Type-safe anchor. Props:

| Prop | Type | Notes |
| --- | --- | --- |
| `route` | a key of `router.routings` | Required. |
| `params` | inferred from the route | Required when the route has params; omit otherwise. |
| `shouldPreventDefault` | `(e: MouseEvent) => boolean` | Skip SPA navigation when this returns `true`. |
| `href` | `string` | When provided, renders a plain anchor and ignores routing. |
| ...rest | `<a>` props | Forwarded as-is. |

### `useNavigate()` / `useRedirect()`

Return `(key, params?) => void`. `useNavigate` calls `history.push`;
`useRedirect` calls `history.replace`.

## `RouteProvider`

```ts
function RouteProvider(props: {history: History; children: ReactNode}): JSX.Element;
```

Provides the history instance to descendant hooks. Must wrap any component
that uses `useRouter`, `useLocation`, `useHistory`, or
`routingHooksFactory(...)` outputs.

## `useRouter(router)`

```ts
function useRouter<R extends Record<string, Routing<string>>>(router: Router<R>): ReactNode;
```

Subscribes to history updates and renders the route matching the current
location. Throws `LocationNotFoundError` if nothing matches.

## `useLocation()`

```ts
function useLocation(): Location;
```

Returns the current `Location` and re-renders on history changes.

## `useHistory()`

```ts
function useHistory(): History;
```

Returns the raw `History` from context. Useful for `back()`, `forward()`, and
storing `state` alongside navigations.

## `LocationNotFoundError` / `isLocationNotFoundError(err)`

```ts
class LocationNotFoundError extends Error {
  location: Location;
}

function isLocationNotFoundError(err: unknown): err is LocationNotFoundError;
```

Thrown by `Router.render` when nothing matches. Use the type guard in
`catch` blocks.

## History factories

### `createBrowserHistory(): History`

A `History` backed by `window.history` and `popstate`. Reads the current URL
on creation.

### `createMemoryHistory(options?): MemoryHistory`

```ts
type MemoryHistoryOptions = {
  initialEntries?: ReadonlyArray<To>;
  initialIndex?: number;
};

type MemoryHistory = History & {
  readonly index: number;
  readonly entries: ReadonlyArray<Location>;
};
```

In-memory history for tests and non-DOM environments. `push` truncates
forward entries (browser-like).

## Types

### `PathParser<Path>`

Type-level parser for a path string.

| Path | Result |
| --- | --- |
| `/` | `{}` |
| `/users/:id` | `{id: string}` |
| `/products?q=q&sort=s` | `{$search: Partial<{q: string; sort: string}>}` |
| `/users/:id?tab=tab` | `{id: string; $search: Partial<{tab: string}>}` |

### `Routing<Path>`

```ts
type Routing<Path extends string> = {
  path: Path;
  match: (pathname: string) => boolean;
  render: (loc: Location) => ReactNode;
  buildUrl: (args: PathParser<Path>) => string;
  extractParams: (location: Location) => PathParser<Path>;
};
```

### `History`

```ts
type History = {
  readonly action: HistoryAction;
  readonly location: Location;
  push: (to: To, state?: unknown) => void;
  replace: (to: To, state?: unknown) => void;
  listen: (listener: (update: Update) => void) => () => void;
  go: (delta: number) => void;
  back: () => void;
  forward: () => void;
};
```

### `Location` / `To` / `Update` / `HistoryAction`

```ts
type HistoryAction = 'PUSH' | 'REPLACE' | 'POP';

type Location = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
};

type To = string | Partial<Pick<Location, 'pathname' | 'search' | 'hash'>>;

type Update = {action: HistoryAction; location: Location};
```
