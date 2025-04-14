import {render, screen} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {describe, it, expect, beforeEach} from 'vitest';

import {route, RouteProvider, useRouter} from './index';

// Debug function to inspect router
function dumpRouterInfo(router: any) {
  console.log('Router routes:');
  Object.entries(router.routings).forEach(([key, routing]: [string, any]) => {
    console.log(`  ${key}: path='${routing.path}'`);
  });
}

describe('Router.group', () => {
  beforeEach(() => {
    // Clear console before each test
    console.clear();
  });

  it('correctly handles routes with prefixes', () => {
    // Create a router with grouped routes
    const router = route('root', '/', () => <div data-testid="page">Root Page</div>)
      .group('/admin', (adminRouter) =>
        adminRouter
          .route('/dashboard', '/', () => <div data-testid="page">Admin Dashboard</div>)
          .route('/admin-users', '/users', () => <div data-testid="page">Admin Users</div>)
          .route('/user-detail', '/users/:userId', (args) => <div data-testid="page">User {args.userId}</div>),
      )
      .group('/api', (apiRouter) =>
        apiRouter
          .route('/v1-users', '/v1/users', () => <div data-testid="page">API v1 Users</div>)
          // // Test nested group
          // .group('/v2', (v2Router) => v2Router.route('users', '/users', () => <div data-testid="page">API v2 Users</div>)),
      );

    // Debug: Output router information
    dumpRouterInfo(router);

    // Test component that uses the router
    function App() {
      const renderedRoute = useRouter(router);
      return <div>{renderedRoute}</div>;
    }

    // Test each route with different history locations
    const testCases = [
      {path: '/', expected: 'Root Page'},
      {path: '/admin', expected: 'Admin Dashboard'},
      {path: '/admin/users', expected: 'Admin Users'},
      {path: '/admin/users/123', expected: 'User 123'},
      {path: '/api/v1/users', expected: 'API v1 Users'},
    ];

    for (const testCase of testCases) {
      console.log(`\nTesting route: ${testCase.path}`);

      // Create memory history with the test path
      const history = createMemoryHistory({
        initialEntries: [testCase.path],
      });

      console.log('History location:', history.location);

      // Check if any route matches this path
      console.log('Matching routes:');
      Object.entries(router.routings).forEach(([key, routing]: [string, any]) => {
        const matches = routing.match(history.location.pathname);
        console.log(`  ${key}: ${matches ? 'MATCH' : 'no match'}`);
      });

      try {
        // Render the app with the current history
        const {unmount} = render(
          <RouteProvider history={history}>
            <App />
          </RouteProvider>,
        );

        // Assert the rendered content
        expect(screen.getByTestId('page').textContent).toContain(testCase.expected);

        // Clean up after each test case
        unmount();
      } catch (error) {
        console.error('Error rendering route:', error);
        throw error;
      }
    }
  });

  it('passes path parameters correctly in grouped routes', () => {
    // Create a router with a grouped route that has path parameters
    const router = route('root', '/', () => <div>Root Page</div>).group('/users', (usersRouter) =>
      usersRouter
        .route('/user-detail', '/:userId/profile', (args) => <div data-testid="user-id">{args.userId}</div>)
        .route('/user-posts', '/:userId/posts/:postId', (args) => (
          <div>
            <div data-testid="user-id">{args.userId}</div>
            <div data-testid="post-id">{args.postId}</div>
          </div>
        )),
    );

    // Debug: Output router information
    dumpRouterInfo(router);

    // Test component that uses the router
    function App() {
      const renderedRoute = useRouter(router);
      return <div>{renderedRoute}</div>;
    }

    // Test user profile route
    const profileHistory = createMemoryHistory({
      initialEntries: ['/users/123/profile'],
    });

    console.log('\nTesting route: /users/123/profile');
    console.log('History location:', profileHistory.location);

    // Check if any route matches this path
    console.log('Matching routes for profile:');
    Object.entries(router.routings).forEach(([key, routing]: [string, any]) => {
      const matches = routing.match(profileHistory.location.pathname);
      console.log(`  ${key}: ${matches ? 'MATCH' : 'no match'}`);
    });

    const {unmount: unmountProfile} = render(
      <RouteProvider history={profileHistory}>
        <App />
      </RouteProvider>,
    );

    expect(screen.getByTestId('user-id').textContent).toBe('123');
    unmountProfile();

    // Test user posts route
    const postsHistory = createMemoryHistory({
      initialEntries: ['/users/456/posts/789'],
    });

    console.log('\nTesting route: /users/456/posts/789');
    console.log('History location:', postsHistory.location);

    // Check if any route matches this path
    console.log('Matching routes for posts:');
    Object.entries(router.routings).forEach(([key, routing]: [string, any]) => {
      const matches = routing.match(postsHistory.location.pathname);
      console.log(`  ${key}: ${matches ? 'MATCH' : 'no match'}`);
    });

    render(
      <RouteProvider history={postsHistory}>
        <App />
      </RouteProvider>,
    );

    expect(screen.getByTestId('user-id').textContent).toBe('456');
    expect(screen.getByTestId('post-id').textContent).toBe('789');
  });
});
