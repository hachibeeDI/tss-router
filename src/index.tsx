/**
 * sample:
 * ```typescript
 * import {createBrowserHistory} from 'history';
 * import {route, useRouter, RouteProvider} from 'tss-router';
 *
 * const r = route('root', '/', (params) => {
 *   return <div>`${params.foo + params.bar}`</div>;
 * })
 * .add('test', '/act/:foo/hoge', (params) => {
 *   return <div>`${params.foo + params.bar}`</div>;
 * })
 * .add('test2', '/act/:foo/hoge/:bar/baz', (params) => {
 *   return <div>`${params.foo + params.bar}`</div>;
 * })
 * // Group related routes with a common prefix
 * .group('/api', (apiRouter) => {
 *   return apiRouter
 *     .route('users', '/users', (params) => {
 *       return <div>API Users List</div>;
 *     })
 *     .route('user-detail', '/users/:userId', (params) => {
 *       return <div>User {params.userId} Details</div>;
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
import type {PathParser, Routing, History} from './types';

type AsOptionalparamsIf<T> = keyof T extends never ? [] : [T];

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

function defaultLayout<PathPrefix extends PrefixRestriction, Ctx>(_ctx: Ctx, _params: PathParser<PathPrefix>, children: ReactNode) {
  return children;
}
type AsContextParam<T, Params extends PathParser<string>> = keyof T extends never ? [] : [T | ((params: Params) => T)];

class GroupRouter<KeyPrefix extends string, PathPrefix extends PrefixRestriction, Routings extends Record<string, Routing<string>>, Ctx> {
  public routings: Routings = {} as Routings;
  private keyPrefix: KeyPrefix;
  private pathPrefix: PathPrefix;
  private layout: (ctx: Ctx, params: PathParser<PathPrefix>, children: ReactNode) => ReactNode;

  constructor(
    keyPrefix: KeyPrefix,
    pathPrefix: PathPrefix,
    layout: (ctx: Ctx, params: PathParser<PathPrefix>, children: ReactNode) => ReactNode = defaultLayout,
  ) {
    this.keyPrefix = keyPrefix;
    this.pathPrefix = pathPrefix;
    this.layout = layout;
  }

  public route<const Key extends string, const Path extends InnerPathRestriction>(
    key: Key,
    path: Path,
    render: (params: PathParser<`${PathPrefix}${Path}`>) => ReactNode,
    ...[context]: AsContextParam<Ctx, PathParser<`${PathPrefix}${Path}`>>
  ): GroupRouter<KeyPrefix, PathPrefix, Routings & {[k in `${KeyPrefix}${Key}`]: Routing<`${PathPrefix}${Path}`>}, Ctx> {
    const fullKey = `${this.keyPrefix}${key}` as const;
    const fullPath = `${this.pathPrefix}${path}` as const;

    (this.routings as any)[fullKey] = buildRoute(fullPath, render, {
      Middleware: (props) =>
        this.layout(
          typeof context === 'function' ? (context as any)(props.params) : context,
          // it's kinda up cast so it's safe
          props.params as any,
          props.children,
        ),
    });
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
    render: (params: PathParser<Path>) => ReactNode,
  ): Router<Routings & {[k in Key]: Routing<Path>}> {
    return this.add(key, path, render);
  }

  /** @deprecated Use `route` instead. */
  public add<const Key extends string, const Path extends string>(
    key: Key,
    path: Path,
    render: (params: PathParser<Path>) => ReactNode,
  ): Router<Routings & {[k in Key]: Routing<Path>}> {
    // Yes, mutation and type unsafe
    (this.routings as any)[key] = buildRoute(path, render);

    return this as any;
  }

  /**
   * Creates a group of routes with a common path prefix.
   * @param prefix The common path prefix for all routes in the group
   * @param render A function that configures routes within this group
   * @returns The router instance with the grouped routes added
   */
  public group<
    const KeyPrefix extends string,
    const PathPrefix extends PrefixRestriction,
    R extends Record<string, Routing<string>>,
    Ctx = undefined,
  >(
    keyPrefix: KeyPrefix,
    prefix: PathPrefix,
    renderOrLayoutAndRender:
      | ((router: GroupRouter<KeyPrefix, PathPrefix, Routings, Ctx>) => GroupRouter<KeyPrefix, PathPrefix, R, Ctx>)
      | {
          layout: (ctx: Ctx, params: PathParser<PathPrefix>, children: ReactNode) => ReactNode;
          render: (router: GroupRouter<KeyPrefix, PathPrefix, Routings, Ctx>) => GroupRouter<KeyPrefix, PathPrefix, R, Ctx>;
        },
  ): Router<Routings & R> {
    const grouped =
      typeof renderOrLayoutAndRender === 'function'
        ? renderOrLayoutAndRender(new GroupRouter(keyPrefix, prefix))
        : renderOrLayoutAndRender.render(new GroupRouter(keyPrefix, prefix, renderOrLayoutAndRender.layout));

    this.routings = {...this.routings, ...grouped.routings};

    return this as any;
  }

  public buildUrl<const Key extends string>(key: Key, params: PathParser<Routings[Key]['path']>): string {
    return (this.routings as any)[key].buildUrl(params);
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
  render: (params: PathParser<Path>) => ReactNode,
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
  ? LinkPropsBase<Key> & {params?: undefined}
  : LinkPropsBase<Key> & {
      params: PathParser<Routings[Key]['path']>;
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
        ...[params]: AsOptionalparamsIf<PathParser<Routings[Key]['path']>>
      ): void => {
        const url = router.buildUrl(
          key,
          // Limit of type inference
          (params ?? {}) as any,
        );
        histCtx[operation](url);
      };
    };
  }

  function Link<const Key extends Extract<keyof Routings, string>>(props: LinkProps<Routings, Key>) {
    const {shouldPreventDefault, onClick, href, route, params, ...rest} = props;
    const histCtx = useHistory();
    if (href) {
      return <a {...rest} href={href} />;
    }

    const url = router.buildUrl(
      route,
      // Limit of type inference
      (params ?? {}) as any,
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
