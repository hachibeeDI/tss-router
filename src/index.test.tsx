import React, {type ReactNode} from 'react';

import {createMemoryHistory} from 'history';
import {describe, expect, expectTypeOf, test} from 'vitest';
import {render, screen} from '@testing-library/react';

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
    .add('test2', '/', (_args) => <div>This is test2</div>);
  const {Link, useNavigate} = routingHooksFactory(router);

  test('works fine', async () => {
    function Root({children}: {children: ReactNode}) {
      const history = createMemoryHistory();
      return <RouteProvider history={history}>{children}</RouteProvider>;
    }

    function App() {
      const r = useRouter(router);
      return (
        <div>
          <Link route="test" args={{foo: 'a', bar: 'hgoe'}}>
            aaaa
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

    expect(await screen.findByText('This is root page')).toBeTruthy();
    expect(await screen.queryByText('This is test1')).toBeFalsy();
  });
});
