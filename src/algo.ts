import type {ReactNode, MouseEvent} from 'react';
import {PLACEHOLDER, type Location, type PathParser, type Routing} from './types';

export function pathAlgorithmFactory<Path extends string>(path: Path) {
  // Normalize definition by removing any empty segments that might come from double slashes
  const definition = path.split('/').filter((segment) => segment !== '');

  return {
    match: (pathname: string) => {
      // Normalize target path by removing any empty segments
      const targetPath = pathname.split('/').filter((segment) => segment !== '');

      // Path lengths must match (accounting for path parameters)
      if (targetPath.length !== definition.length) {
        return false;
      }

      // Check each path segment
      for (const i of targetPath.keys()) {
        // Skip placeholders as they can match anything
        // biome-ignore lint/style/noNonNullAssertion: array indexes are valid
        const def = definition[i]!;
        if (def.startsWith(PLACEHOLDER)) {
          continue;
        }

        // Compare static segments
        // biome-ignore lint/style/noNonNullAssertion: array indexes are valid
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

      // Split path into segments and handle URL params
      // biome-ignore lint/style/noNonNullAssertion: path is defined
      const pathname = path.split('?')[0]!;

      const builtPathname = pathname
        .split('/')
        .filter((segment) => segment !== '') // Remove empty segments
        .map((x) => {
          if (x.startsWith(PLACEHOLDER)) {
            const key = x.replace(PLACEHOLDER, '');
            return (params as any)[key];
          }
          return x;
        })
        .join('/');

      // Ensure URL starts with slash
      return `/${builtPathname}${paramPart}`;
    },

    extractParams: (location: Location): PathParser<Path> => {
      // Normalize both paths by removing empty segments
      const targetPath = location.pathname.split('/').filter((segment) => segment !== '');
      const pathDef = path
        .split('?')[0]
        ?.split('/')
        .filter((segment) => segment !== '');

      // If path definition is missing or lengths don't match
      if (pathDef == null || targetPath.length !== pathDef.length) {
        return {} as PathParser<Path>;
      }

      // Handle search params
      let $search: undefined | Record<string, string> = undefined;
      if (location.search !== '') {
        $search = {};
        for (const [key, value] of new URLSearchParams(location.search)) {
          $search[key] = value;
        }
      }

      // Extract path parameters
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

export function buildRoute<const Path extends string>(
  path: Path,
  render: (args: PathParser<Path>) => ReactNode,
  opts?:
    | undefined
    | {
        Middleware?: (props: {params: PathParser<Path>; location: Location; children: ReactNode}) => ReactNode;
      },
): Routing<Path> {
  const matcher = pathAlgorithmFactory(path);
  const {Middleware} = opts ?? {};
  return {
    path,
    match: matcher.match,
    buildUrl: matcher.urlBuilder,
    extractParams: matcher.extractParams,
    render: Middleware
      ? (loc: Location) => Middleware({params: matcher.extractParams(loc), location: loc, children: render(matcher.extractParams(loc))})
      : (loc: Location) => render(matcher.extractParams(loc)),
  };
}

export function isModifiedEvent(e: MouseEvent) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
}
