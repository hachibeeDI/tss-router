/**
 * sample:
 * ```typescript
 * import {createBrowserHistory} from 'history';
 * import {route, useRouter, RouteProvider} from 'tss-router';
 *
 * const r = route('root', '/', (args) => {
 *   return <div>`${args.foo + args.bar}`</div>;
 * })
 * .add('test', '/act/:foo/hoge', (args) => {
 *   return <div>`${args.foo + args.bar}`</div>;
 * })
 * .add('test2', '/act/:foo/hoge/:bar/baz', (args) => {
 *   return <div>`${args.foo + args.bar}`</div>;
 * });
 *
 * funcion App() {
 *   const route = useRouter(r);
 *   return <div>{route}</div>;
 * }
 *
 * function Main() {
 *   const history = createBrowserHistory();
 *   return (
 *     <RouteProvider history={history}>
 *       <App />
 *     </RouteProvider>
 *   );
 * }
 * ```
 */

import {AssertionError} from 'assert';

import type {ComponentProps, ReactNode} from 'react';
import React, {createContext, use, useSyncExternalStore} from 'react';
import type {History} from 'history';

import {buildRoute} from './algo';
import type {PathParser, Routing} from './types';

type AsOptionalArgsIf<T> = keyof T extends never ? [] : [T];

export class LocationNotFoundError extends Error {
  public location: History['location'];

  constructor(location: History['location']) {
    super(`Location ${location.pathname} is not found`);
    this.location = location;
  }
}

export function isLocationNotFoundError(err: unknown): err is LocationNotFoundError {
  return err instanceof LocationNotFoundError;
}

class Router<Routings extends Record<string, Routing<string>>> {
  public routings: Routings;
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

  public buildUrl<const Key extends string>(key: Key, args: PathParser<Routings[Key]['path']>): string {
    return (this.routings as any)[key].buildUrl(args);
  }

  public render(target: History['location']): ReactNode {
    const found = Object.values(this.routings).find((routing) => routing.match.match(target.pathname));
    if (found == null) {
      throw new LocationNotFoundError(target);
    }

    return found.render(target.pathname);
  }
}

export function route<const Key extends string, const Path extends string>(
  key: Key,
  path: Path,
  render: (args: PathParser<Path>) => ReactNode,
): Router<Record<Key, Routing<Path>>> {
  return new Router({[key]: buildRoute(path, render)} as Record<Key, Routing<Path>>);
}

const HistoryContext = createContext<{history: History} | null>(null);

type RouteProviderProps = {
  history: History;
  children: ReactNode;
};

export function RouteProvider({history, children}: RouteProviderProps) {
  return <HistoryContext.Provider value={{history}}>{children}</HistoryContext.Provider>;
}

export function useHistory(): History {
  const ctx = use(HistoryContext);
  if (ctx == null) {
    throw new AssertionError({message: 'tss-router functions must be used within under a <RouteProvider /> Context.'});
  }
  return ctx?.history;
}

export function useLocation(): History['location'] {
  const hist = useHistory();
  return useSyncExternalStore(hist.listen, () => hist.location);
}

/**
 *
 */
export function routingHooksFactory<Routings extends Record<string, Routing<string>>>(router: Router<Routings>) {
  function createUseRouteOperation(operation: 'push' | 'replace') {
    return function useRouteOperation() {
      const histCtx = useHistory();

      return <const Key extends Extract<keyof Routings, string>>(
        key: Key,
        ...[args]: AsOptionalArgsIf<PathParser<Routings[Key]['path']>>
      ): void => {
        const url = router.buildUrl(
          key,
          // Limit of type inference
          (args ?? {}) as any,
        );
        histCtx[operation](url);
      };
    };
  }

  type RouteProps<Key extends string> = keyof PathParser<Routings[Key]['path']> extends never
    ? {route: Key; args?: undefined}
    : {
        route: Key;
        args: PathParser<Routings[Key]['path']>;
      };

  function Link<const Key extends Extract<keyof Routings, string>>(props: ComponentProps<'a'> & RouteProps<Key>) {
    const {href, route, args, ...rest} = props;
    const histCtx = useHistory();
    if (href) {
      return <a {...rest} href={href} />;
    }

    return (
      <a
        {...rest}
        // biome-ignore lint/a11y/useValidAnchor: I know what I'm doing
        onClick={(e) => {
          e.preventDefault();
          const url = router.buildUrl(
            route,
            // Limit of type inference
            (args ?? {}) as any,
          );
          histCtx.push(url);
        }}
      />
    );
  }

  return {
    useNavigate: createUseRouteOperation('push'),
    useRedirect: createUseRouteOperation('replace'),
    Link,
  };
}

export function useRouter<Routings extends Record<string, Routing<string>>>(router: Router<Routings>) {
  const loc = useLocation();

  return router.render(loc);
}
