# Navigation

`routingHooksFactory(router)` returns a Provider, hooks, and a `Link`
component — all bound to your router's exact routing types.

```ts
import {routingHooksFactory} from 'tss-route-lib';

const {RouteProvider, useRouter, useMatch, useNavigate, useRedirect, Link} = routingHooksFactory(router);
```

You typically call this once at module scope (e.g. in `routes.tsx`) and
import the destructured pieces from there. Components never need to import
the router itself.

## `<Link>`

A type-safe replacement for `<a>`.

```tsx
<Link route="home">Home</Link>
<Link route="user" params={{id: '123'}}>View user 123</Link>
<Link route="search" params={{$search: {q: 'shoes'}}}>Search shoes</Link>
```

Behavior:

- Generates the URL via `router.buildUrl(route, params)`. It is rendered into
  the `href` attribute, so middle-click / "open in new tab" still works.
- On normal click, calls `history.push(url)` and prevents the browser from
  navigating away.
- On modified click (`Cmd`/`Ctrl`/`Shift`/`Alt`), the default browser
  behavior wins — same as a real anchor.
- Accepts the standard anchor props (`className`, `aria-*`, etc.).

### Opting out

Two escape hatches:

```tsx
// Provide href explicitly — bypasses router and renders a plain <a>.
<Link route="home" href="https://example.com">External</Link>

// Decide per-click whether to skip the SPA navigation.
<Link
  route="user"
  params={{id: '1'}}
  shouldPreventDefault={(e) => e.target instanceof HTMLElement && e.target.dataset.skip === 'true'}
>
  Click
</Link>
```

When `shouldPreventDefault` returns true, `Link` does **not** call
`e.preventDefault()` and does **not** push to history.

## `useNavigate` and `useRedirect`

Programmatic navigation. Both return a function with the same signature; the
difference is that `useNavigate` calls `history.push` and `useRedirect` calls
`history.replace`.

```ts
const navigate = useNavigate();
const redirect = useRedirect();

navigate('home');
navigate('user', {id: '123'});
navigate('search', {$search: {q: 'shoes'}});

redirect('home'); // doesn't add a history entry
```

If a route has no params, you can call it without the second argument. If it
has required path params or a `$search` template, TypeScript requires you to
pass them.

## Reading the current location

```ts
import {useLocation, useHistory} from 'tss-route-lib';

function Crumbs() {
  const loc = useLocation(); // { pathname, search, hash, state, key }
  return <span>{loc.pathname}</span>;
}

function BackButton() {
  const history = useHistory();
  return <button onClick={() => history.back()}>Back</button>;
}
```

`useLocation` is implemented with `useSyncExternalStore`, so re-renders are
tied to history updates without a global subscription.

## Knowing what's matched

`useMatch` returns the route currently being rendered, so you can drive UI
state (active nav links, breadcrumbs) without parsing the URL yourself.

```tsx
// Boolean — am I on this route?
const onUserPage = useMatch('user') != null;

// Discriminated union — which route, and what params?
const match = useMatch();
if (match?.key === 'user') {
  console.log(match.params.id); // typed as string
}
```

The keyed form is the right fit for `<Link>` active-state styling. The
no-arg form pairs well with `switch (match?.key)` patterns in layout
components.

Resolution matches `useRouter` exactly: registration order, first match wins.
A shadowed route returns `null` even when its pattern would match in
isolation.

## Why no `<Outlet />`?

Routes in tss-router render through `useRouter()`. There is no nested route
element tree — composition is done in plain JSX or via `.group(...)`
layouts. If you've used React Router, the mental model is "one router, one
render call".
