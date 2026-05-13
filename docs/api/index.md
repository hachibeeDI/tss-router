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

The single binding point between a router and the app. Returns a Provider,
hooks, and a `Link` component — all typed via the router passed in.

```ts
const {RouteProvider, useRouter, useMatch, useNavigate, useRedirect, Link} = routingHooksFactory(router);
```

Because the router lives inside the factory's closure, components don't need
to import the router itself; they only import the destructured outputs.

### `RouteProvider`

```ts
function RouteProvider(props: {history: History; children: ReactNode}): JSX.Element;
```

Wraps the app and provides the history instance. Every other hook from the
factory (and `useLocation` / `useHistory` from the package) must run under
this Provider.

### `useRouter()`

```ts
function useRouter(): ReactNode;
```

Subscribes to history updates and renders the route matching the current
location. Throws `LocationNotFoundError` if nothing matches.

### `useMatch()` / `useMatch(key)`

```ts
function useMatch(): {key: keyof R; params: ...} | null;
function useMatch<K extends keyof R>(key: K): PathParser<R[K]['path']> | null;
```

Returns information about the route currently being rendered.

- **No-arg**: returns `{key, params}` for whichever route matches, or `null`.
  `key` is a discriminated union of all route keys, so `params` is typed
  precisely once you narrow on `key`.
- **Keyed**: returns the typed `params` iff `key` is the route currently
  being rendered, otherwise `null`. This is the form you want for nav-link
  active states.

Resolution mirrors `useRouter` — registration order, first match wins. A route
that's *shadowed* by an earlier registration returns `null` even though its
pattern would match.

```tsx
// Highlight the active link
const onUserPage = useMatch('user') != null;

// Read params and key together
const m = useMatch();
if (m?.key === 'user') {
  console.log(m.params.id); // typed as string
}
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

## `useLocation()`

```ts
function useLocation(): Location;
```

Returns the current `Location` and re-renders on history changes. Top-level
export — works under any `RouteProvider`, regardless of the router.

## `useHistory()`

```ts
function useHistory(): History;
```

Returns the raw `History` from context. Useful for `back()`, `forward()`, and
storing `state` alongside navigations. Top-level export.

## `useBlocker(shouldBlock)`

```ts
type BlockerFn = (args: {
  currentLocation: Location;
  nextLocation: Location;
  historyAction: HistoryAction;
}) => boolean;

type BlockerState =
  | {state: 'unblocked'; location: null; proceed: null; reset: null}
  | {state: 'blocked'; location: Location; proceed: () => void; reset: () => void}
  | {state: 'proceeding'; location: Location; proceed: null; reset: null};

function useBlocker(shouldBlock: boolean | BlockerFn): BlockerState;
```

Intercepts navigations while `shouldBlock` is truthy. The returned state
machine drives a confirmation UI:

- `'unblocked'` — no transition pending.
- `'blocked'` — a navigation is paused at `location`. Call `proceed()`
  to run it, or `reset()` to cancel and stay put.
- `'proceeding'` — `proceed()` was called and the navigation is in flight.

`shouldBlock` may be a boolean or a predicate. The predicate runs on
every pending transition, so you can decide per-target. The hook holds
the latest predicate in a ref, so passing a fresh closure each render
does **not** re-register the underlying blocker.

Scope: blocks `push` / `replace` / `POP` (back/forward). Does **not**
block tab close / reload / external navigation — use `beforeunload` for
those.

See [Blocking navigations](/guide/navigation#blocking-navigations) for
usage patterns.

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
  block: (blocker: Blocker) => () => void;
  go: (delta: number) => void;
  back: () => void;
  forward: () => void;
};
```

`block(blocker)` registers a transition guard and returns an unregister
function. Only one blocker can be active at a time — registering a new
one replaces the previous.

### `Blocker` / `Transition`

```ts
type Transition = {
  action: HistoryAction;
  location: Location;
  retry: () => void;
};

type Blocker = (tx: Transition) => void;
```

A `Blocker` receives the pending transition. The navigation only takes
effect when the blocker calls `tx.retry()`; doing nothing cancels it.

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
