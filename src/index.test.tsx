import {act, type ReactNode} from 'react';

import {createMemoryHistory} from 'history';
import {describe, expect, test} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import {RouteProvider, useRouter, route, routingHooksFactory} from './index';

describe('route', () => {
  const router = route('root', '/', () => <div>This is root page</div>)
    .add('test', '/act/:foo/hoge/:bar/baz', (args) => (
      <div>
        <div>This is test1</div>
        <div>{`foo=${args.foo}, bar=${args.bar}`}</div>
      </div>
    ))
    .add('test2', '/abcdef', (_args) => <div>This is test2</div>)
    .add('user', '/user/:id?limit=x&query=y', (params) => (
      <div>
        <div>This is user</div>
        <div>user id = {params.id}</div>
        <div>search.limit={params.$search.limit ?? 'nasi!'}</div>
        <div>search.query={params.$search.query ?? 'nasi!'}</div>
      </div>
    ))
    .add('test3', '/root/:abuba/ro/:foo', (args) => (
      <div>
        <div>This is test3</div>
        <div>
          foo={args.foo}, abuba={args.abuba}
        </div>
      </div>
    ));
  const {Link, useNavigate} = routingHooksFactory(router);

  test('works fine', async () => {
    const history = createMemoryHistory();
    function Root({children}: {children: ReactNode}) {
      return <RouteProvider history={history}>{children}</RouteProvider>;
    }

    function App() {
      const r = useRouter(router);
      const nav = useNavigate();
      return (
        <div>
          <Link route="test" args={{foo: 'a', bar: 'hgoe'}}>
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

          <Link route="user" args={{id: 'a', $search: {query: 'hopper'}}}>
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

    screen.debug();

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

    screen.debug();
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

    screen.debug();
    expect(history.index).toBe(4);
    expect(history.location.pathname).toBe('/user/a');
    expect(await screen.queryByText('This is user')).toBeInTheDocument();
    expect(await screen.queryByText('user id = a')).toBeInTheDocument();
    expect(await screen.queryByText('search.limit=nasi!')).toBeInTheDocument();
    expect(await screen.queryByText('search.query=hopper')).toBeInTheDocument();
  });
});
