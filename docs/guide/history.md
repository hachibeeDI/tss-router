# History

`tss-router` ships with two `History` implementations. They share the same
interface and you swap them at the application root.

## Browser history

```ts
import {createBrowserHistory, RouteProvider} from 'tss-route-lib';

const history = createBrowserHistory();

<RouteProvider history={history}>
  <App />
</RouteProvider>;
```

- Reads `window.location` and `window.history.state` on creation.
- `push(to)` calls `pushState`; `replace(to)` calls `replaceState`.
- Listens to `popstate` so back/forward buttons update subscribers.
- `state` you pass to `push`/`replace` is stored in `window.history.state`
  alongside an internal `key` used for entry identity.

## Memory history

```ts
import {createMemoryHistory} from 'tss-route-lib';

const history = createMemoryHistory({
  initialEntries: ['/users/123'],
  initialIndex: 0,
});
```

- Holds an in-memory stack of entries.
- `push` appends and **drops any forward entries** (browser-like behavior).
- `replace` swaps the current entry without changing the index.
- `back()` / `forward()` / `go(delta)` move within the stack and emit `POP`.
- Exposes additional read-only fields: `index` and `entries`.

This is the right choice for tests, server-rendered fragments, or any
non-browser environment.

## Working with `To`

Both implementations accept the same `To` shape:

```ts
type To = string | Partial<{pathname: string; search: string; hash: string}>;
```

Strings are parsed (`?` and `#` are split off the pathname). Object form lets
you skip parsing.

```ts
history.push('/users/1?tab=posts#top');
history.push({pathname: '/users/1', search: '?tab=posts', hash: '#top'});
```

## Subscribing manually

```ts
const unsub = history.listen((update) => {
  console.log(update.action, update.location.pathname);
});
unsub();
```

`useLocation()` already does this internally. You only need to call `listen`
yourself for non-React code paths (analytics, logging, etc.).

## Bring your own history

The router only depends on the `History` type from `tss-route-lib`.
Implement that interface and you can plug in anything (a hash router, a
stateful URL shim, etc.).

```ts
import type {History} from 'tss-route-lib';

const myHistory: History = {
  /* ... */
};
```
