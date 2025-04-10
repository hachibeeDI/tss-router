import React from 'react';

import {describe, expect, expectTypeOf, test} from 'vitest';

import {route, routingHooksFactory} from './index';

const DUMMY_HOST = 'https://hoge.com';

describe('route', () => {
  test('works fine', () => {
    const router = route('test', '/act/:foo/hoge/:bar/baz', (args) => {
      return `${args.foo + args.bar}`;
    }).add('test2', '/', (_args) => <div>agege</div>);
    const {Link, useNavigate} = routingHooksFactory(router);

    const nav = useNavigate();
    nav('test', {foo: 'ababa'});
    nav('test2');

    function X() {
      return (
        <div>
          <Link route="test" args={{foo: 'a', bar: 'hgoe'}}>
            aaaa
          </Link>
        </div>
      );
    }

    router.routings.test.match.match(new URL(`${DUMMY_HOST}/act/foo/hoge/bar/baz`));
  });
});
