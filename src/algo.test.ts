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

  test('omits trailing "?" when $search is an empty object', () => {
    expect(
      pathAlgorithmFactory('/users/:id?q=q').urlBuilder({
        id: 'abc',
        $search: {},
      } as never),
    ).toBe('/users/abc');
  });

  test('drops nullish $search entries instead of emitting "key=undefined"', () => {
    expect(
      pathAlgorithmFactory('/users/:id?q=q&limit=limit').urlBuilder({
        id: 'abc',
        $search: {q: 'hi', limit: undefined},
      } as never),
    ).toBe('/users/abc?q=hi');

    // all entries nullish -> no trailing "?"
    expect(
      pathAlgorithmFactory('/users/:id?q=q&limit=limit').urlBuilder({
        id: 'abc',
        $search: {q: undefined, limit: undefined},
      } as never),
    ).toBe('/users/abc');
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

  describe('URL encoding', () => {
    test('encodes reserved characters in path params', () => {
      const algo = pathAlgorithmFactory('/users/:id');
      // '/', '?', '#' would otherwise break the path/query/fragment boundary
      expect(algo.urlBuilder({id: 'a/b'})).toBe('/users/a%2Fb');
      expect(algo.urlBuilder({id: 'a?b'})).toBe('/users/a%3Fb');
      expect(algo.urlBuilder({id: 'a#b'})).toBe('/users/a%23b');
    });

    test('encodes spaces and non-ASCII characters in path params', () => {
      const algo = pathAlgorithmFactory('/q/:term');
      expect(algo.urlBuilder({term: 'hello world'})).toBe('/q/hello%20world');
      expect(algo.urlBuilder({term: '日本語'})).toBe('/q/%E6%97%A5%E6%9C%AC%E8%AA%9E');
    });

    test('encodes reserved characters in $search via URLSearchParams', () => {
      const algo = pathAlgorithmFactory('/q?term=term');
      // URLSearchParams uses application/x-www-form-urlencoded: space -> '+', '&' -> '%26', etc.
      expect(algo.urlBuilder({$search: {term: 'a&b=c'}})).toBe('/q?term=a%26b%3Dc');
      expect(algo.urlBuilder({$search: {term: 'hello world'}})).toBe('/q?term=hello+world');
    });

    test('decodes percent-encoded path params on extract', () => {
      const extract = pathAlgorithmFactory('/users/:id').extractParams;
      expect(extract({pathname: '/users/a%2Fb', search: '', hash: '', state: undefined, key: ''})).toEqual({id: 'a/b'});
      expect(extract({pathname: '/users/hello%20world', search: '', hash: '', state: undefined, key: ''})).toEqual({
        id: 'hello world',
      });
      expect(extract({pathname: '/users/%E6%97%A5%E6%9C%AC%E8%AA%9E', search: '', hash: '', state: undefined, key: ''})).toEqual({
        id: '日本語',
      });
    });

    test('build then extract round-trips special characters', () => {
      const algo = pathAlgorithmFactory('/q/:term?filter=filter');
      const built = algo.urlBuilder({term: 'a/b c', $search: {filter: 'x&y'}});
      expect(built).toBe('/q/a%2Fb%20c?filter=x%26y');

      const [pathname, search] = built.split('?');
      expect(
        algo.extractParams({pathname: pathname ?? '', search: search ? `?${search}` : '', hash: '', state: undefined, key: ''}),
      ).toEqual({term: 'a/b c', $search: {filter: 'x&y'}});
    });
  });
});
