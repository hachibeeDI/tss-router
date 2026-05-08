# Typed Super Simple Router

A type-safe, lightweight router for React applications that provides strong TypeScript support for route parameters.

📖 **[Documentation](https://hachibeedi.github.io/tss-router/)** · [Getting Started](https://hachibeedi.github.io/tss-router/guide/getting-started) · [API Reference](https://hachibeedi.github.io/tss-router/api/)

## Features

- **Type-safe route parameters**: Get compile-time checking for route parameters
- **Simple API**: Intuitive API for defining routes and navigation
- **Zero external dependencies**: Core functionality has no runtime dependencies
- **Compatible with history API**: Works with standard browser history or memory history for testing

## Installation

```sh
$ npm install --save tss-route-lib
```

## Code example

```tsx
import { route, routingHooksFactory, createBrowserHistory } from 'tss-router';

// Define your routes with type-safe parameters
const router = route('root', '/', () => <div>Home Page</div>)
  .at('users', '/users', () => <div>Users List</div>)
  .at('userDetail', '/users/:userId', (params) => (
    <div>User Details for ID: {params.userId}</div>
  ))
  .at('userPosts', '/users/:userId/posts/:postId', (params) => (
    <div>
      Posts for user {params.userId}
      {params.postId && <span> - Viewing post {params.postId}</span>}
    </div>
  ))
  .at('searchProducts', '/products?query=query&category=category&sort=sort', (params) => (
    <div>
      Product search results
      {params.$search.query && <span> for: {params.$search.query}</span>}
      {params.$search.category && <span> in category: {params.$search.category}</span>}
      {params.$search.sort && <span> sorted by: {params.$search.sort}</span>}
    </div>
  ));

// Build the typed toolkit (Provider + hooks + Link) for this router.
const { RouteProvider, useRouter, useNavigate, Link } = routingHooksFactory(router);

// Navigation component with type-safe links
function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      {/* Regular links with automatic navigation */}
      <Link route="root">Home</Link>
      <Link route="users">Users</Link>
      <Link route="userDetail" params={{ userId: "123" }}>User 123</Link>

      {/* Link with search parameters */}
      <Link route="searchProducts" params={{$search: {query: "laptop", category: "electronics", sort: "price" }}}>
        Search Electronics
      </Link>

      {/* Programmatic navigation */}
      <button onClick={() => navigate('userPosts', { userId: "123", postId: "456" })}>
        View User 123's Post 456
      </button>

      {/* Programmatic navigation with search parameters */}
      <button onClick={() => navigate('searchProducts', {$search: {query: "shoes", sort: "newest" }})}>
        Search for shoes
      </button>
    </nav>
  );
}

// Main application
function App() {
  const view = useRouter();
  return (
    <div>
      <Navigation />
      <main>{view}</main>
    </div>
  );
}

// Wrap with RouteProvider at the application root
function Main() {
  const history = createBrowserHistory();
  return (
    <RouteProvider history={history}>
      <App />
    </RouteProvider>
  );
}
```


