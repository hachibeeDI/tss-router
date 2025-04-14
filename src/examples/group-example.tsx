import React from 'react';
import {createBrowserHistory} from 'history';
import {route, useRouter, RouteProvider} from '../index';

// Example of using the group method to organize routes
const router = route('root', '/', () => {
  return <div>Root Page</div>;
})
  .add('about', '/about', () => {
    return <div>About Page</div>;
  })
  // Group admin routes under /admin prefix
  .group('/admin', (adminRouter) => {
    return (
      adminRouter
        .route('dashboard', '', () => {
          // This will be available at /admin
          return <div>Admin Dashboard</div>;
        })
        .route('admin-users', '/users', () => {
          // This will be available at /admin/users
          return <div>Admin Users</div>;
        })
        .route('user-detail', '/users/:userId', (args) => {
          // This will be available at /admin/users/:userId
          return <div>User Detail for {args.userId}</div>;
        })
        // Nested group for settings under /admin/settings
        .group('/settings', (settingsRouter) => {
          return settingsRouter
            .route('general', '', () => {
              // This will be available at /admin/settings
              return <div>General Settings</div>;
            })
            .route('security', '/security', () => {
              // This will be available at /admin/settings/security
              return <div>Security Settings</div>;
            });
        })
    );
  })
  // Group API routes under /api prefix
  .group('/api', (apiRouter) => {
    return (
      apiRouter
        .route('users', '/users', () => {
          // This will be available at /api/users
          return <div>API Users</div>;
        })
        .route('user-detail', '/users/:userId', (args) => {
          // This will be available at /api/users/:userId
          return <div>API User Detail for {args.userId}</div>;
        })
        // Nested group for versioned API endpoints
        .group('/v1', (v1Router) => {
          return v1Router.route('users', '/users', () => {
            // This will be available at /api/v1/users
            return <div>API v1 Users</div>;
          });
        })
        .group('/v2', (v2Router) => {
          return v2Router.route('users', '/users', () => {
            // This will be available at /api/v2/users
            return <div>API v2 Users</div>;
          });
        })
    );
  });

function App() {
  const renderedRoute = useRouter(router);

  return (
    <div>
      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/about">About</a>
          </li>
          <li>
            <a href="/admin">Admin Dashboard</a>
          </li>
          <li>
            <a href="/admin/users">Admin Users</a>
          </li>
          <li>
            <a href="/admin/users/123">User 123</a>
          </li>
          <li>
            <a href="/admin/settings">Settings</a>
          </li>
          <li>
            <a href="/admin/settings/security">Security Settings</a>
          </li>
          <li>
            <a href="/api/users">API Users</a>
          </li>
          <li>
            <a href="/api/v1/users">API v1 Users</a>
          </li>
          <li>
            <a href="/api/v2/users">API v2 Users</a>
          </li>
        </ul>
      </nav>
      <main>{renderedRoute}</main>
    </div>
  );
}

function ExampleApp() {
  const history = createBrowserHistory();
  return (
    <RouteProvider history={history}>
      <App />
    </RouteProvider>
  );
}

export default ExampleApp;
