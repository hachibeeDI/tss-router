# Getting Started

`tss-router` is a small, type-safe router for React. Routes are declared with a
fluent builder, so the path you write *is* the source of truth: TypeScript
infers the shape of `params` (path placeholders + the optional `$search` map),
and `Link` / `useNavigate` enforce that you pass the right keys at the call
site.

## Installation

::: code-group

```sh [npm]
npm install tss-route-lib
```

```sh [pnpm]
pnpm add tss-route-lib
```

```sh [yarn]
yarn add tss-route-lib
```

:::

`react` (>=19) is a peer dependency. The library has no other runtime
dependencies — its browser/memory history implementations ship with the
package.

## Quick start

```tsx
import {RouteProvider, createBrowserHistory, route, routingHooksFactory, useRouter} from 'tss-route-lib';

const router = route('home', '/', () => <div>Home</div>)
  .at('user', '/users/:id', (params) => <div>User {params.id}</div>)
  .at('search', '/search?q=q', (params) => <div>Searching: {params.$search.q ?? '(none)'}</div>);

const {Link, useNavigate} = routingHooksFactory(router);

function App() {
  const view = useRouter(router);
  const navigate = useNavigate();

  return (
    <div>
      <nav>
        <Link route="home">Home</Link>
        <Link route="user" params={{id: '123'}}>User 123</Link>
        <button type="button" onClick={() => navigate('search', {$search: {q: 'shoes'}})}>
          Search shoes
        </button>
      </nav>
      <main>{view}</main>
    </div>
  );
}

function Main() {
  return (
    <RouteProvider history={createBrowserHistory()}>
      <App />
    </RouteProvider>
  );
}
```

## What you get from this snippet

- `<Link route="user" params={...}>` errors at compile time if `id` is missing.
- `navigate('search', {$search: {q: 'shoes'}})` knows that `q` is the only allowed key.
- The render function for each route receives `params` typed exactly to that path.
- Path values are URL-encoded automatically; search values go through
  `URLSearchParams`.

Continue with [Defining routes](./routes) for a deeper look at the builder.
