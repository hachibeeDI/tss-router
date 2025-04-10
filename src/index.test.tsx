import React, {act, type ReactNode} from 'react';

import {createMemoryHistory} from 'history';
import {describe, expect, test} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import {RouteProvider, useRouter, route, routingHooksFactory} from './index';

const _DUMMY_HOST = 'https://hoge.com';

describe('route', () => {
  const router = route('root', '/', () => <div>This is root page</div>)
    .add('test', '/act/:foo/hoge/:bar/baz', (args) => (
      <div>
        <div>This is test1</div>
        <div>{`${args.foo + args.bar}`}</div>
      </div>
    ))
    .add('test2', '/abcdef', (_args) => <div>This is test2</div>);
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
            button test
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

    expect(history.index).toBe(1);

    expect(await screen.queryByText('This is root page')).toBeInTheDocument();
    expect(await screen.queryByText('This is test1')).toBeInTheDocument();
  });
});
