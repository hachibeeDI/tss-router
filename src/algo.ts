import type {ReactNode} from 'react';
import {PLACEHOLDER, type PathParser, type Routing} from './types';

export function pathMatcherFactory<Path extends string>(path: Path) {
  const definition = path.split('/');

  return {
    match: (pathname: string) => {
      // ignore search param
      const targetPath = pathname.split('/');

      if (targetPath.length !== definition.length) {
        return false;
      }

      for (const i of targetPath.keys()) {
        // biome-ignore lint/style/noNonNullAssertion: 100% sure
        const def = definition[i]!;
        if (def.startsWith(PLACEHOLDER)) {
          continue;
        }
        // biome-ignore lint/style/noNonNullAssertion: 100% sure
        const p = targetPath[i]!;

        if (def !== p) {
          return false;
        }
      }

      return true;
    },

    urlBuilder: (params: PathParser<Path>) => {
      let paramPart = '';
      if ('$search' in params && params.$search != null) {
        paramPart = `?${Object.entries(params.$search)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')}`;
      }

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const pathname = path.split('?')[0]!;

      const builtPathname = pathname
        .split('/')
        .map((x) => {
          if (x.startsWith(PLACEHOLDER)) {
            const key = x.replace(PLACEHOLDER, '');
            return (params as any)[key];
          }
          return x;
        })
        .join('/');
      return `${builtPathname}${paramPart}`;
    },
  };
}

export function buildRoute<const Path extends string>(path: Path, render: (args: PathParser<Path>) => ReactNode): Routing<Path> {
  const matcher = pathMatcherFactory(path);
  return {
    path,
    match: matcher.match,
    buildUrl: matcher.urlBuilder,
    render,
  };
}
