# Testing

The router was designed to be testable. `createMemoryHistory` is the only
piece you need to drive a router without a DOM environment beyond what your
test renderer provides.

## A typical test

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryHistory, route, routingHooksFactory} from 'tss-route-lib';

const router = route('home', '/', () => <div>Home</div>)
  .at('user', '/users/:id', (p) => <div>User {p.id}</div>);
const {RouteProvider, useRouter, Link} = routingHooksFactory(router);

test('navigates to a user', async () => {
  const history = createMemoryHistory();
  function App() {
    return useRouter();
  }

  render(
    <RouteProvider history={history}>
      <Link route="user" params={{id: '1'}}>Go</Link>
      <App />
    </RouteProvider>,
  );

  expect(screen.getByText('Home')).toBeInTheDocument();
  await userEvent.click(screen.getByText('Go'));
  expect(history.location.pathname).toBe('/users/1');
  expect(screen.getByText('User 1')).toBeInTheDocument();
});
```

## Inspecting state directly

`MemoryHistory` exposes `index` and `entries` for assertions:

```ts
const history = createMemoryHistory();
history.push('/a');
history.push('/b');

expect(history.index).toBe(2);
expect(history.entries.map((e) => e.pathname)).toEqual(['/', '/a', '/b']);

history.back();
expect(history.index).toBe(1);
expect(history.action).toBe('POP');
```

## Seeding initial state

For tests that start mid-flow, pass `initialEntries` and `initialIndex`:

```ts
const history = createMemoryHistory({
  initialEntries: ['/list', '/users/1', '/users/1/posts/9'],
  initialIndex: 1,
});

// Starts at /users/1; back() goes to /list, forward() goes to /users/1/posts/9.
```

## Pure rendering without React Testing Library

You don't have to render the tree. `Routing` and `Router` are usable directly:

```ts
const router = route('user', '/users/:id', (p) => <div>{p.id}</div>);
router.buildUrl('user', {id: '42'});         // "/users/42"
router.render({pathname: '/users/42', search: '', hash: '', state: null, key: ''});
```

Use this for unit tests of param parsing or URL building without a DOM.
