import type {ReactNode, MouseEvent} from 'react';
import {PLACEHOLDER, type Location, type PathParser, type Routing} from './types';

export function pathAlgorithmFactory<Path extends string>(path: Path) {
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

    extractParams: (location: Location): PathParser<Path> => {
      const targetPath = location.pathname.split('/');
      const pathDef = path.split('?')[0]?.split('/');
      // if use this method for wrong location against path
      if (pathDef == null || targetPath.length !== pathDef.length) {
        return {} as PathParser<Path>;
      }

      let $search: undefined | Record<string, string> = undefined;
      if (location.search !== '') {
        $search = {};
        for (const [key, value] of new URLSearchParams(location.search)) {
          $search[key] = value;
        }
      }

      return (
        Array.from(targetPath.keys())
          // biome-ignore lint/style/noNonNullAssertion: array length confirmed
          .map((i) => [i, pathDef[i]!] as const)
          .filter(([_i, def]) => def.startsWith(PLACEHOLDER))
          .reduce(
            (buf, [i, def]) => {
              const key = def.replace(PLACEHOLDER, '');
              // biome-ignore lint/style/noNonNullAssertion: array length confirmed
              (buf as any)[key] = targetPath[i]!;
              return buf;
            },
            $search ? {$search} : {},
          ) as PathParser<Path>
      );
    },
  };
}

export function buildRoute<const Path extends string>(path: Path, render: (args: PathParser<Path>) => ReactNode): Routing<Path> {
  const matcher = pathAlgorithmFactory(path);
  return {
    path,
    match: matcher.match,
    buildUrl: matcher.urlBuilder,
    extractParams: matcher.extractParams,
    render: (loc: Location) => render(matcher.extractParams(loc)),
  };
}

export function isModifiedEvent(e: MouseEvent) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
}
