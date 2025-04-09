import type {ReactNode} from 'react';

const PLACEHOLDER = ':';
type PLACEHOLDER = typeof PLACEHOLDER;

type ParseQueryParam<Parampath extends string> = Parampath extends `${infer Key}=${string}&${infer Rests}`
  ? {[k in Key]: string} & ParseQueryParam<Rests>
  : Parampath extends `${infer Key}=${string}`
    ? {[k in Key]: string}
    : never;

type BuildParam<Keys extends string> = {[k in Keys]: string};

type BodyParser<Path extends string> = Path extends `${string}/${PLACEHOLDER}${infer P}/${infer Rests}`
  ? P | BodyParser<Rests>
  : Path extends `${string}/${PLACEHOLDER}${infer P}`
    ? P
    : never;

type PathParser<Path extends string> = Path extends `${infer Uri}?${infer SParam}`
  ? BuildParam<BodyParser<Uri>> & {
      /** You must thought search path is optional */
      $search: Partial<ParseQueryParam<SParam>>;
    }
  : BuildParam<BodyParser<Path>>;

type PathMatcher = {
  match: (target: URL) => boolean;
};

export function pathMatcherFactory<Path extends string>(path: Path) {
  const definition = path.split('/');

  return {
    match: (target: URL) => {
      // ignore search param
      const targetPath = target.pathname.split('/');

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
  };
}

export function urlBuilder<const Path extends string>(path: Path, params: PathParser<Path>): string {
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
}

/**
 * routing itself
 */
type Routing<Path extends string> = {
  path: Path;
  match: PathMatcher;
  render: (args: PathParser<Path>) => ReactNode;
  buildUrl: (args: PathParser<Path>) => string;
};

export function buildRoute<const Path extends string>(path: Path, render: (args: PathParser<Path>) => ReactNode): Routing<Path> {
  const matcher = pathMatcherFactory(path);
  return {
    path,
    match: matcher,
    render,
    buildUrl: (args) => urlBuilder(path, args),
  };
}

class Router<Routings extends Record<string, Routing<string>>> {
  private routings: Routings;
  constructor(route: Routings) {
    this.routings = route;
  }

  public add<const Key extends string, const Path extends string>(
    key: Key,
    path: Path,
    render: (args: PathParser<Path>) => ReactNode,
  ): Router<Routings & {[k in Key]: Routing<Path>}> {
    // Yes, mutation and type unsafe
    (this.routings as any)[key] = buildRoute(path, render);

    return this as any;
  }
}

export function route<const Key extends string, const Path extends string>(
  key: Key,
  path: Path,
  render: (args: PathParser<Path>) => ReactNode,
): Router<{[key]: Routing<Path>}> {
  return new Router({[key]: buildRoute(path, render)});
}
