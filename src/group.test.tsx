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

  // FIXME: AI generated gargabe.
  // It doesn't know how to write test :(  However, it's a good starting point.
  it('correctly handles routes with prefixes', async () => {
    // Create a router with grouped routes
    const router = route('root', '/', () => <div>Root Page</div>)
      .group('root', '/admin', (adminRouter) =>
        adminRouter
          .route('/dashboard', '/', () => <div>Admin Dashboard</div>)
          .route('/admin-users', '/users', () => <div>Admin Users</div>)
          .route('/user-detail', '/users/:userId', (params) => <div>User {params.userId}</div>),
      )
      .group(
        'api',
        '/api',
        {
          layout: (_ctx, _params, children) => (
            <div>
              <div>Api Layout</div>

              <section>{children}</section>
            </div>
          ),
          render: (apiRouter) => apiRouter.route('/v1-users', '/v1/users', () => <div>API v1 Users</div>),
        },
        // // Test nested group
        // .group('/v2', (v2Router) => v2Router.route('users', '/users', () => <div >API v2 Users</div>)),
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
      // test middleware
      {path: '/api/v1/users', expected: 'Api Layout'},
      {path: '/api/v1/users', expected: 'API v1 Users'},
    ];

    for (const testCase of testCases) {
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

      const {unmount} = render(
        <RouteProvider history={history}>
          <App />
        </RouteProvider>,
      );

      screen.debug();

      expect(await screen.findByText(testCase.expected)).toBeInTheDocument();

      unmount();
    }
  });

  it('passes path parameters correctly in grouped routes', async () => {
    // Create a router with a grouped route that has path parameters
    const router = route('root', '/', () => <div>Root Page</div>).group('users', '/users/:userId', {
      layout: (_ctx, params, children) => (
        <div>
          <div>User Layout Id={params.userId}</div>
          {children}
        </div>
      ),
      render: (usersRouter) =>
        usersRouter
          .route('/user-detail', '/profile', (params) => <div data-testid="user-id">{params.userId}</div>)
          .route('/user-posts', '/posts/:postId', (params) => (
            <div>
              <div data-testid="user-id">{params.userId}</div>
              <div data-testid="post-id">{params.postId}</div>
            </div>
          )),
    });

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
    expect(await screen.findByText('User Layout Id=123')).toBeInTheDocument();

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
