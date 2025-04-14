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
 * })
 * // Group related routes with a common prefix
 * .group('/api', (apiRouter) => {
 *   return apiRouter
 *     .route('users', '/users', (args) => {
 *       return <div>API Users List</div>;
 *     })
 *     .route('user-detail', '/users/:userId', (args) => {
 *       return <div>User {args.userId} Details</div>;
 *     });
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

import type {ComponentProps, ReactNode, MouseEvent} from 'react';
import {createContext, use, useSyncExternalStore} from 'react';

import {buildRoute, isModifiedEvent} from './algo';
import type {PathParser, Routing, History, Location} from './types';

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

type PrefixRestriction = `/${string}`;
type InnerPathRestriction = PrefixRestriction;

type MiddlewareProps<Prefix extends PrefixRestriction> = {
  params: PathParser<Prefix>;
  location: Location;
  children: ReactNode;
};

class GroupRouter<Prefix extends PrefixRestriction, Routings extends Record<string, Routing<string>>> {
  public routings: Routings = {} as Routings;
  private prefix: Prefix;
  public Middleware?: (props: MiddlewareProps<Prefix>) => ReactNode;

  constructor(prefix: Prefix) {
    this.prefix = prefix;
  }

  public use(middleware: (props: MiddlewareProps<Prefix>) => ReactNode) {
    this.Middleware = middleware;
    return this;
  }

  public route<const Key extends InnerPathRestriction, const Path extends InnerPathRestriction>(
    key: Key,
    path: Path,
    render: (args: PathParser<`${Prefix}${Path}`>) => ReactNode,
  ): GroupRouter<Prefix, Routings & {[k in `${Prefix}${Key}`]: Routing<`${Prefix}${Path}`>}> {
    const fullKey = `${this.prefix}${key}` as const;
    const fullPath = `${this.prefix}${path}` as const;

    (this.routings as any)[fullKey] = buildRoute(
      fullPath,
      render,
      this.Middleware == null
        ? undefined
        : {
            Middleware: (props) => (this.Middleware as any)(props),
          },
    );
    return this as any;
  }
}

class Router<Routings extends Record<string, Routing<string>>> {
  public routings: Routings;
  constructor(route: Routings) {
    this.routings = route;
  }

  public route<const Key extends string, const Path extends string>(
    key: Key,
    path: Path,
    render: (args: PathParser<Path>) => ReactNode,
  ): Router<Routings & {[k in Key]: Routing<Path>}> {
    return this.add(key, path, render);
  }

  /** @deprecated Use `route` instead. */
  public add<const Key extends string, const Path extends string>(
    key: Key,
    path: Path,
    render: (args: PathParser<Path>) => ReactNode,
  ): Router<Routings & {[k in Key]: Routing<Path>}> {
    // Yes, mutation and type unsafe
    (this.routings as any)[key] = buildRoute(path, render);

    return this as any;
  }

  /**
   * Creates a group of routes with a common path prefix.
   * @param prefix The common path prefix for all routes in the group
   * @param groupFn A function that configures routes within this group
   * @returns The router instance with the grouped routes added
   */
  public group<const Prefix extends PrefixRestriction, R extends Record<string, Routing<string>>>(
    prefix: Prefix,
    groupFn: (router: GroupRouter<Prefix, Routings>) => GroupRouter<Prefix, R>,
  ): Router<Routings & R> {
    const grouped = groupFn(new GroupRouter(prefix));

    this.routings = {...this.routings, ...grouped.routings};

    return this as any;
  }

  public buildUrl<const Key extends string>(key: Key, args: PathParser<Routings[Key]['path']>): string {
    return (this.routings as any)[key].buildUrl(args);
  }

  public render(target: History['location']): ReactNode {
    const found = Object.values(this.routings).find((routing) => routing.match(target.pathname));
    if (found == null) {
      throw new LocationNotFoundError(target);
    }

    return found.render(target);
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

type LinkPropsBase<Key extends string> = {
  route: Key;
  shouldPreventDefault?: (e: MouseEvent) => boolean;
};

type RouteProps<Routings extends Record<string, Routing<string>>, Key extends string> = keyof PathParser<
  Routings[Key]['path']
> extends never
  ? LinkPropsBase<Key> & {args?: undefined}
  : LinkPropsBase<Key> & {
      args: PathParser<Routings[Key]['path']>;
    };

export type LinkProps<Routings extends Record<string, Routing<string>>, Key extends Extract<keyof Routings, string>> = ComponentProps<'a'> &
  RouteProps<Routings, Key>;

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

  function Link<const Key extends Extract<keyof Routings, string>>(props: LinkProps<Routings, Key>) {
    const {shouldPreventDefault, onClick, href, route, args, ...rest} = props;
    const histCtx = useHistory();
    if (href) {
      return <a {...rest} href={href} />;
    }

    const url = router.buildUrl(
      route,
      // Limit of type inference
      (args ?? {}) as any,
    );

    return (
      <a
        {...rest}
        href={href ?? url}
        onClick={(e) => {
          if (onClick) {
            onClick(e);
          }
          if (shouldPreventDefault?.(e)) {
            return;
          }
          if (isModifiedEvent(e)) {
            return;
          }

          e.preventDefault();
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
