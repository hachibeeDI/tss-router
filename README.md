# Typed Super Simple Router

A type-safe, lightweight router for React applications that provides strong TypeScript support for route parameters.

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
import { createBrowserHistory } from 'history';
import { route, useRouter, RouteProvider, routingHooksFactory } from 'tss-router';

// Define your routes with type-safe parameters
const router = route('root', '/', () => <div>Home Page</div>)
  .add('users', '/users', () => <div>Users List</div>)
  .add('userDetail', '/users/:userId', (params) => (
    <div>User Details for ID: {params.userId}</div>
  ))
  .add('userPosts', '/users/:userId/posts/:postId', (params) => (
    <div>
      Posts for user {params.userId}
      {params.postId && <span> - Viewing post {params.postId}</span>}
    </div>
  ))
  .add('searchProducts', '/products?query=query&category=category&sort=sort', (params) => (
    <div>
      Product search results
      {params.$search.query && <span> for: {params.$search.query}</span>}
      {params.$search.category && <span> in category: {params.$search.category}</span>}
      {params.$search.sort && <span> sorted by: {params.$search.sort}</span>}
    </div>
  ));

// Create navigation hooks
const { useNavigate, useRedirect, Link } = routingHooksFactory(router);

// Navigation component with type-safe links
function Navigation() {
  const navigate = useNavigate();
  
  return (
    <nav>
      {/* Regular links with automatic navigation */}
      <Link route="root">Home</Link>
      <Link route="users">Users</Link>
      <Link route="userDetail" args={{ userId: "123" }}>User 123</Link>
      
      {/* Link with search parameters */}
      <Link route="searchProducts" searchParams={{ query: "laptop", category: "electronics", sort: "price" }}>
        Search Electronics
      </Link>
      
      {/* Programmatic navigation */}
      <button onClick={() => navigate('userPosts', { userId: "123", postId: "456" })}>
        View User 123's Post 456
      </button>
      
      {/* Programmatic navigation with search parameters */}
      <button onClick={() => navigate('searchProducts', {}, { query: "shoes", sort: "newest" })}>
        Search for shoes
      </button>
    </nav>
  );
}

// Main application
function App() {
  const route = useRouter(router);
  return (
    <div>
      <Navigation />
      <main>{route}</main>
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


