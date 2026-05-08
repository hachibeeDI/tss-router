import {describe, expect, expectTypeOf, test} from 'vitest';

import {buildRoute, pathAlgorithmFactory} from './algo';

describe('matcher', () => {
  test('test plain', () => {
    const plainMatcher = pathAlgorithmFactory('/foo/bar/baz');

    expect(plainMatcher.match('/foo')).toBeFalsy();
    expect(plainMatcher.match('/foo/bar')).toBeFalsy();

    expect(plainMatcher.match('/foo/bar/baz')).toBeTruthy();

    expect(plainMatcher.match('/foo/bar/baz/hom')).toBeFalsy();
  });

  test('test simple args', () => {
    const simpleArgMatcher = pathAlgorithmFactory('/hoge/:id');
    expect(simpleArgMatcher.match('/foo/abcs')).toBeFalsy();
    expect(simpleArgMatcher.match('/hoge')).toBeFalsy();

    expect(simpleArgMatcher.match('/hoge/12345')).toBeTruthy();

    expect(simpleArgMatcher.match('/hoge/abcdef/baz')).toBeFalsy();
    expect(simpleArgMatcher.match('/hoge/bar/baz/hom')).toBeFalsy();
  });

  test('complex args', () => {
    const complArgsMat = pathAlgorithmFactory('/hoge/:id/leef/:leefId');
    expect(complArgsMat.match('/foo/abcs')).toBeFalsy();

    expect(complArgsMat.match('/hoge')).toBeFalsy();
    expect(complArgsMat.match('/hoge/12345')).toBeFalsy();
    expect(complArgsMat.match('/hoge/abcdef/baz')).toBeFalsy();
    expect(complArgsMat.match('/hoge/bar/baz/hom')).toBeFalsy();

    expect(complArgsMat.match('/hoge/bar/leef/hom')).toBeTruthy();
  });

  test('matches root path', () => {
    const m = pathAlgorithmFactory('/');
    expect(m.match('/')).toBeTruthy();
    // empty string normalizes to the same as '/'
    expect(m.match('')).toBeTruthy();
    expect(m.match('/foo')).toBeFalsy();
  });

  test('tolerates trailing slash on target', () => {
    const m = pathAlgorithmFactory('/foo/bar');
    expect(m.match('/foo/bar/')).toBeTruthy();
    expect(m.match('/foo/bar')).toBeTruthy();
  });

  test('tolerates duplicate slashes', () => {
    const m = pathAlgorithmFactory('/foo/bar');
    expect(m.match('//foo//bar//')).toBeTruthy();
  });

  test('static segments are case-sensitive', () => {
    const m = pathAlgorithmFactory('/Foo/Bar');
    expect(m.match('/Foo/Bar')).toBeTruthy();
    expect(m.match('/foo/bar')).toBeFalsy();
  });

  test('placeholder cannot span multiple segments', () => {
    const m = pathAlgorithmFactory('/u/:id');
    expect(m.match('/u/123')).toBeTruthy();
    expect(m.match('/u/abc/def')).toBeFalsy();
  });

  test('definition with query template ignores the query when matching', () => {
    // search-only definition (no path placeholder before ?). The query template
    // is metadata used by the type system / extractParams; the matcher must
    // ignore it so /products matches the definition.
    const m = pathAlgorithmFactory('/products?query=query&category=category');
    expect(m.match('/products')).toBeTruthy();
    expect(m.match('/products/extra')).toBeFalsy();

    const withParam = pathAlgorithmFactory('/users/:id?limit=x');
    expect(withParam.match('/users/abc')).toBeTruthy();
    expect(withParam.match('/users')).toBeFalsy();
  });
});

describe('url builder', () => {
  test('test plain', () => {
    expect(pathAlgorithmFactory('/foo/bar/baz').urlBuilder({})).toBe('/foo/bar/baz');
    expect(pathAlgorithmFactory('/foo/:bar/baz').urlBuilder({bar: 'oooo'})).toBe('/foo/oooo/baz');
    expect(pathAlgorithmFactory('/foo/bar/:baz').urlBuilder({baz: 'gagagga'})).toBe('/foo/bar/gagagga');

    expect(
      pathAlgorithmFactory('/foo/:bar/leef/:baz/nandakana/:last').urlBuilder({
        bar: 'wowo',
        baz: 'gagagga',
        last: 'final',
      }),
    ).toBe('/foo/wowo/leef/gagagga/nandakana/final');

    expect(
      pathAlgorithmFactory('/foo/:bar/leef/:baz/nandakana/:last?token=token&id=id').urlBuilder({
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

  test('builds the root path', () => {
    expect(pathAlgorithmFactory('/').urlBuilder({} as never)).toBe('/');
  });

  test('omits query string when $search is undefined', () => {
    // The path has a query template but the caller did not pass $search
    expect(
      pathAlgorithmFactory('/users/:id?q=q').urlBuilder({
        id: 'abc',
      } as never),
    ).toBe('/users/abc');
  });

  test('builds with only some search params provided', () => {
    expect(
      pathAlgorithmFactory('/users/:id?q=q&limit=limit').urlBuilder({
        id: 'abc',
        $search: {q: 'hi'},
      } as never),
    ).toBe('/users/abc?q=hi');
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

  describe('extract params', () => {
    test('works fine', () => {
      const extractParams = pathAlgorithmFactory('/act/:foo/hoge/:bar/baz').extractParams;
      expect(extractParams({pathname: '/act/foo/hoge/bar/baz', search: '', hash: '', state: undefined, key: ''})).toEqual({
        foo: 'foo',
        bar: 'bar',
      });
      expect(extractParams({pathname: '/act/foo/hoge/bar/baz', search: '?token=token&id=id', hash: '', state: undefined, key: ''})).toEqual(
        {
          foo: 'foo',
          bar: 'bar',
          $search: {token: 'token', id: 'id'},
        },
      );
    });

    test('returns empty object on segment-length mismatch', () => {
      const extract = pathAlgorithmFactory('/users/:id').extractParams;
      expect(extract({pathname: '/users', search: '', hash: '', state: undefined, key: ''})).toEqual({});
      expect(extract({pathname: '/users/1/extra', search: '', hash: '', state: undefined, key: ''})).toEqual({});
    });

    test('tolerates trailing slash in pathname', () => {
      const extract = pathAlgorithmFactory('/users/:id').extractParams;
      expect(extract({pathname: '/users/123/', search: '', hash: '', state: undefined, key: ''})).toEqual({id: '123'});
    });

    test('decodes URL-encoded search values', () => {
      const extract = pathAlgorithmFactory('/q?term=term').extractParams;
      expect(extract({pathname: '/q', search: '?term=hello%20world', hash: '', state: undefined, key: ''})).toEqual({
        $search: {term: 'hello world'},
      });
    });

    test('extracts an empty-valued search param', () => {
      const extract = pathAlgorithmFactory('/q?term=term').extractParams;
      expect(extract({pathname: '/q', search: '?term=', hash: '', state: undefined, key: ''})).toEqual({
        $search: {term: ''},
      });
    });

    test('keeps the last value when a search key appears multiple times', () => {
      // Documents the current behavior: URLSearchParams iteration overwrites,
      // so duplicate keys collapse to the last occurrence.
      const extract = pathAlgorithmFactory('/q?term=term').extractParams;
      expect(extract({pathname: '/q', search: '?term=a&term=b', hash: '', state: undefined, key: ''})).toEqual({
        $search: {term: 'b'},
      });
    });
  });

  describe('round-trip build then extract', () => {
    test('preserves path params', () => {
      const algo = pathAlgorithmFactory('/users/:id/posts/:postId');
      const built = algo.urlBuilder({id: 'u1', postId: 'p1'});
      expect(built).toBe('/users/u1/posts/p1');
      expect(algo.match(built)).toBeTruthy();
      expect(algo.extractParams({pathname: built, search: '', hash: '', state: undefined, key: ''})).toEqual({
        id: 'u1',
        postId: 'p1',
      });
    });

    test('preserves search params alongside path params', () => {
      const algo = pathAlgorithmFactory('/users/:id?q=q&limit=limit');
      const built = algo.urlBuilder({id: 'u1', $search: {q: 'hi', limit: '10'}});
      expect(built).toBe('/users/u1?q=hi&limit=10');
      // simulate how a History object would split pathname/search
      const [pathname, search] = built.split('?');
      // biome-ignore lint/style/noNonNullAssertion: split always returns at least one element
      expect(algo.match(pathname!)).toBeTruthy();
      expect(
        algo.extractParams({pathname: pathname ?? '', search: search ? `?${search}` : '', hash: '', state: undefined, key: ''}),
      ).toEqual({
        id: 'u1',
        $search: {q: 'hi', limit: '10'},
      });
    });
  });

  describe('current limitations (documented)', () => {
    test('urlBuilder does NOT URL-encode path or search values', () => {
      // The library expects callers to pass already-encoded values, or values
      // that don't need encoding. Surfacing this so a future change to add
      // encoding is a deliberate, observable update.
      const algo = pathAlgorithmFactory('/users/:id?q=q');
      expect(algo.urlBuilder({id: 'a/b', $search: {q: 'a&b'}})).toBe('/users/a/b?q=a&b');
    });
  });
});
