import {act, type ReactNode} from 'react';

import {describe, expect, test} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import {route, routingHooksFactory, LocationNotFoundError, isLocationNotFoundError, createMemoryHistory} from './index';

describe('route', () => {
  const router = route('root', '/', () => <div>This is root page</div>)
    .at('test', '/act/:foo/hoge/:bar/baz', (params) => (
      <div>
        <div>This is test1</div>
        <div>{`foo=${params.foo}, bar=${params.bar}`}</div>
      </div>
    ))
    .at('test2', '/abcdef', (_params) => <div>This is test2</div>)
    .at('user', '/user/:id?limit=x&query=y', (params) => (
      <div>
        <div>This is user</div>
        <div>user id = {params.id}</div>
        <div>search.limit={params.$search.limit ?? 'nasi!'}</div>
        <div>search.query={params.$search.query ?? 'nasi!'}</div>
      </div>
    ))
    .at('test3', '/root/:abuba/ro/:foo', (params) => (
      <div>
        <div>This is test3</div>
        <div>
          foo={params.foo}, abuba={params.abuba}
        </div>
      </div>
    ))
    .group('article', '/articles/:id', {
      layout: (ctx: {foo: string}, params, children) => (
        <div>
          <div>Article Layout context="{ctx.foo}"</div>
          <div>This is article layout id={params.id}</div>
          {children}
        </div>
      ),
      render: (g) =>
        g
          .at('/detail', '/detail', ({id}) => <div>This is article detail {id}</div>, {foo: 'detail for'})
          .at(
            '/edit',
            '/edit',
            ({id}) => <div>edit article {id}</div>,
            (params) => ({foo: `edit bar id=${params.id}`}),
          ),
    });
  const {RouteProvider, useRouter, Link, useNavigate} = routingHooksFactory(router);

  test('works fine', async () => {
    const history = createMemoryHistory();
    function Root({children}: {children: ReactNode}) {
      return <RouteProvider history={history}>{children}</RouteProvider>;
    }

    function App() {
      const r = useRouter();
      const nav = useNavigate();
      return (
        <div>
          <Link route="test" params={{foo: 'a', bar: 'hgoe'}}>
            decent anchor
          </Link>
          <button
            type="button"
            onClick={() => {
              nav('test2');
            }}
          >
            button to navigate test2
          </button>

          <Link route="user" params={{id: 'a', $search: {query: 'hopper'}}}>
            anchor to user
          </Link>

          <button
            type="button"
            onClick={() => {
              nav('test3', {foo: 'fm', abuba: 'abc'});
            }}
          >
            button to navigate test3 with params
          </button>

          <Link route="article/detail" params={{id: '123'}}>
            anchor to article detail
          </Link>
          <Link route="article/edit" params={{id: '123'}}>
            anchor to article edit
          </Link>
          {r}
        </div>
      );
    }

    await render(
      <Root>
        <App />
      </Root>,
    );

    expect(await screen.findByText('This is root page')).toBeInTheDocument();
    expect(await screen.queryByText('This is test1')).not.toBeInTheDocument();
    expect(history.index).toBe(0);

    await act(async () => {
      await userEvent.click(await screen.findByText('decent anchor'));
    });

    expect(history.index).toBe(1);

    expect(history.location.pathname).toBe('/act/a/hoge/hgoe/baz');
    expect(await screen.queryByText('This is root page')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test1')).toBeInTheDocument();
    expect(await screen.queryByText('foo=a, bar=hgoe')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(await screen.findByText('button to navigate test2'));
    });

    expect(history.index).toBe(2);
    expect(history.location.pathname).toBe('/abcdef');
    expect(await screen.queryByText('This is root page')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test1')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test2')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(await screen.findByText('button to navigate test3 with params'));
    });

    expect(history.index).toBe(3);
    expect(history.location.pathname).toBe('/root/abc/ro/fm');
    expect(await screen.queryByText('This is root page')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test1')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test2')).not.toBeInTheDocument();
    expect(await screen.queryByText('This is test3')).toBeInTheDocument();
    expect(await screen.queryByText('foo=fm, abuba=abc')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(await screen.findByText('anchor to user'));
    });

    expect(history.index).toBe(4);
    expect(history.location.pathname).toBe('/user/a');
    expect(await screen.queryByText('This is user')).toBeInTheDocument();
    expect(await screen.queryByText('user id = a')).toBeInTheDocument();
    expect(await screen.queryByText('search.limit=nasi!')).toBeInTheDocument();
    expect(await screen.queryByText('search.query=hopper')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(await screen.findByText('anchor to article detail'));
    });

    expect(history.index).toBe(5);
    expect(history.location.pathname).toBe('/articles/123/detail');
    expect(await screen.queryByText('This is article detail 123')).toBeInTheDocument();
    expect(await screen.queryByText('Article Layout context="detail for"')).toBeInTheDocument();
    expect(await screen.queryByText('This is article layout id=123')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(await screen.findByText('anchor to article edit'));
    });

    expect(history.index).toBe(6);
    expect(history.location.pathname).toBe('/articles/123/edit');
    expect(await screen.queryByText('edit article 123')).toBeInTheDocument();
    expect(await screen.queryByText('Article Layout context="edit bar id=123"')).toBeInTheDocument();
    expect(await screen.queryByText('This is article layout id=123')).toBeInTheDocument();
  });
});

describe('Router resolution', () => {
  test('throws LocationNotFoundError when no registered route matches', () => {
    const router = route('home', '/', () => <div>home</div>).at('users', '/users', () => <div>users</div>);

    let caught: unknown;
    try {
      router.render({pathname: '/missing', search: '', hash: '', state: undefined, key: ''});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LocationNotFoundError);
    expect(isLocationNotFoundError(caught)).toBe(true);
    if (isLocationNotFoundError(caught)) {
      expect(caught.location.pathname).toBe('/missing');
    }
  });

  test('first registered matching route wins', () => {
    // Two routes match /users/123: a placeholder route and a literal route
    // registered after it. The placeholder is registered first so it should win.
    const router = route('detail', '/users/:id', (params) => <div>detail {params.id}</div>).at('me', '/users/me', () => <div>me</div>);

    const node = router.render({pathname: '/users/me', search: '', hash: '', state: undefined, key: ''});
    render(<>{node}</>);
    expect(screen.queryByText('detail me')).toBeInTheDocument();
    expect(screen.queryByText('me')).not.toBeInTheDocument();
  });

  test('matches a route whose definition contains a query template', () => {
    // Regression test for: the matcher used to leave the ?... portion in the
    // last definition segment, which made these patterns unmatchable.
    const router = route('search', '/products?query=query&category=category', (params) => (
      <div>search q={params.$search.query ?? 'none'}</div>
    ));

    const node = router.render({
      pathname: '/products',
      search: '?query=laptop',
      hash: '',
      state: undefined,
      key: '',
    });
    render(<>{node}</>);
    expect(screen.queryByText('search q=laptop')).toBeInTheDocument();
  });

  test('pathname matching ignores the URL hash', () => {
    // Hash lives on location.hash, not pathname, so it should never affect routing
    const router = route('home', '/', () => <div>home</div>).at('about', '/about', () => <div>about</div>);

    const node = router.render({pathname: '/about', search: '', hash: '#section', state: undefined, key: ''});
    render(<>{node}</>);
    expect(screen.queryByText('about')).toBeInTheDocument();
  });
});

describe('useMatch', () => {
  const router = route('home', '/', () => null)
    .at('user', '/users/:id', () => null)
    .at('post', '/users/:userId/posts/:postId', () => null)
    .at('search', '/products?q=q', () => null);
  const {RouteProvider, useMatch} = routingHooksFactory(router);

  function renderHook<T>(useHookValue: () => T, initialPath: string): {result: {current: T}} {
    const result: {current: T} = {current: undefined as any};
    function Probe() {
      result.current = useHookValue();
      return null;
    }
    const history = createMemoryHistory({initialEntries: [initialPath]});
    render(
      <RouteProvider history={history}>
        <Probe />
      </RouteProvider>,
    );
    return {result};
  }

  test('no-arg form returns the rendered route key and typed params', () => {
    const {result} = renderHook(() => useMatch(), '/users/42');
    expect(result.current).not.toBeNull();
    if (result.current && result.current.key === 'user') {
      // params should be typed as {id: string}
      expect(result.current.params.id).toBe('42');
    } else {
      throw new Error('expected key=user');
    }
  });

  test('no-arg form returns null when nothing matches', () => {
    const {result} = renderHook(() => useMatch(), '/missing');
    expect(result.current).toBeNull();
  });

  test('keyed form returns params when the named route is the one rendered', () => {
    const {result} = renderHook(() => useMatch('user'), '/users/7');
    expect(result.current).toEqual({id: '7'});
  });

  test('keyed form returns null when a different route matches', () => {
    const {result} = renderHook(() => useMatch('home'), '/users/7');
    expect(result.current).toBeNull();
  });

  test('keyed form returns null when nothing matches at all', () => {
    const {result} = renderHook(() => useMatch('user'), '/missing');
    expect(result.current).toBeNull();
  });

  test('extracts $search params for the matched route', () => {
    const {result} = renderHook(() => useMatch('search'), '/products?q=shoes');
    expect(result.current).toEqual({$search: {q: 'shoes'}});
  });
});

describe('useMatch — registration order', () => {
  // /users/:id is registered before /users/me, so /users/me resolves to user
  const router = route('user', '/users/:id', () => null).at('me', '/users/me', () => null);
  const {RouteProvider, useMatch} = routingHooksFactory(router);

  function renderHook<T>(useHookValue: () => T, initialPath: string): {result: {current: T}} {
    const result: {current: T} = {current: undefined as any};
    function Probe() {
      result.current = useHookValue();
      return null;
    }
    const history = createMemoryHistory({initialEntries: [initialPath]});
    render(
      <RouteProvider history={history}>
        <Probe />
      </RouteProvider>,
    );
    return {result};
  }

  test('first registered matching route wins', () => {
    const {result} = renderHook(() => useMatch(), '/users/me');
    expect(result.current).toEqual({key: 'user', params: {id: 'me'}});
  });

  test('keyed form respects shadowing — shadowed route returns null even if its pattern would match', () => {
    // /users/me technically matches the `me` pattern, but the rendered route is `user`,
    // so useMatch('me') must return null to stay consistent with useRouter.
    const {result} = renderHook(() => useMatch('me'), '/users/me');
    expect(result.current).toBeNull();
  });
});
