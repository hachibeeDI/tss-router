import {describe, expect, expectTypeOf, test} from 'vitest';

import {buildRoute, pathMatcherFactory, urlBuilder} from './index';

const DUMMY_HOST = 'https://hoge.com';

describe('matcher', () => {
  test('test plain', () => {
    const plainMatcher = pathMatcherFactory('/foo/bar/baz');

    expect(plainMatcher.match(new URL(`${DUMMY_HOST}/foo`))).toBeFalsy();
    expect(plainMatcher.match(new URL(`${DUMMY_HOST}/foo/bar`))).toBeFalsy();
    expect(plainMatcher.match(new URL(`${DUMMY_HOST}/foo/bar/baz`))).toBeTruthy();
    expect(plainMatcher.match(new URL(`${DUMMY_HOST}/foo/bar/baz/hom`))).toBeFalsy();
  });

  test('test simple args', () => {
    const simpleArgMatcher = pathMatcherFactory('/hoge/:id');
    expect(simpleArgMatcher.match(new URL(`${DUMMY_HOST}/foo/abcs`))).toBeFalsy();

    expect(simpleArgMatcher.match(new URL(`${DUMMY_HOST}/hoge`))).toBeFalsy();
    expect(simpleArgMatcher.match(new URL(`${DUMMY_HOST}/hoge/12345`))).toBeTruthy();
    expect(simpleArgMatcher.match(new URL(`${DUMMY_HOST}/hoge/abcdef/baz`))).toBeFalsy();
    expect(simpleArgMatcher.match(new URL(`${DUMMY_HOST}/hoge/bar/baz/hom`))).toBeFalsy();
  });

  test('complex args', () => {
    const complArgsMat = pathMatcherFactory('/hoge/:id/leef/:leefId');
    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/foo/abcs`))).toBeFalsy();

    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/hoge`))).toBeFalsy();
    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/hoge/12345`))).toBeFalsy();
    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/hoge/abcdef/baz`))).toBeFalsy();
    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/hoge/bar/baz/hom`))).toBeFalsy();

    expect(complArgsMat.match(new URL(`${DUMMY_HOST}/hoge/bar/leef/hom`))).toBeTruthy();
  });
});

describe('url builder', () => {
  test('test plain', () => {
    expect(urlBuilder('/foo/bar/baz', {})).toBe('/foo/bar/baz');
    expect(urlBuilder('/foo/:bar/baz', {bar: 'oooo'})).toBe('/foo/oooo/baz');
    expect(urlBuilder('/foo/bar/:baz', {baz: 'gagagga'})).toBe('/foo/bar/gagagga');

    expect(
      urlBuilder('/foo/:bar/leef/:baz/nandakana/:last', {
        bar: 'wowo',
        baz: 'gagagga',
        last: 'final',
      }),
    ).toBe('/foo/wowo/leef/gagagga/nandakana/final');

    expect(
      urlBuilder('/foo/:bar/leef/:baz/nandakana/:last?token=token&id=id', {
        bar: 'wowo',
        baz: 'gagagga',
        last: 'final',
        $search: {
          token: 'xyzabc',
          id: '1234abc',
        },
      }),
    ).toBe('/foo/wowo/leef/gagagga/nandakana/final?token=xyzabc&id=1234abc');
  });

  describe('route builder typing', () => {
    test('works fine', () => {
      buildRoute('/act/:foo/hoge/:bar/baz', (args) => {
        expectTypeOf<typeof args>().toEqualTypeOf<{foo: string; bar: string}>();

        return `${args.foo + args.bar}`;
      });

      buildRoute('/act/:foo/hoge/:bar/baz?token=tokeeee&foo=id', (args) => {
        expectTypeOf<typeof args>().toEqualTypeOf<{
          foo: string;
          bar: string;
          $search: {token: undefined | string; foo: undefined | string};
        }>(
          // to surpress a mysterious argument about [MISMATCH]
          '' as any,
        );

        return `${args.$search.token}, ${args.$search.foo}, ${args.foo}, ${args.bar}`;
      });
    });
  });
});
