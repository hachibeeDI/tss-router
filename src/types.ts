import type {ReactNode} from 'react';

export const PLACEHOLDER = ':';
export type PLACEHOLDER = typeof PLACEHOLDER;

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

export type PathParser<Path extends string> = Path extends `${infer Uri}?${infer SParam}`
  ? BuildParam<BodyParser<Uri>> & {
      /** You must thought search path is optional */
      $search: Partial<ParseQueryParam<SParam>>;
    }
  : BuildParam<BodyParser<Path>>;

type Path = {
  pathname: string;
  search: string;
  hash: string;
};

export type Location = Path & {
  state: unknown;
  key: string;
};

export type To = string | Partial<Path>;

export type HistoryAction = 'PUSH' | 'REPLACE' | 'POP';

export type Update = {
  action: HistoryAction;
  location: Location;
};

/**
 * A pending navigation handed to a {@link Blocker}. The transition does not
 * happen until `retry()` is called; calling it bypasses the active blocker
 * for exactly that one navigation.
 */
export type Transition = {
  action: HistoryAction;
  location: Location;
  retry: () => void;
};

export type Blocker = (tx: Transition) => void;

/**
 * The minimal surface that the router needs. Implement this directly if you
 * want to plug in a custom history; otherwise use `createBrowserHistory` /
 * `createMemoryHistory` from this package.
 */
export type History = {
  readonly action: HistoryAction;
  readonly location: Location;
  push: (to: To, state?: unknown) => void;
  replace: (to: To, state?: unknown) => void;
  listen: (listener: (update: Update) => void) => () => void;
  /**
   * Register a blocker that intercepts navigations (push/replace and POP from
   * back/forward). Only one blocker can be active at a time — registering a
   * new one replaces the previous. Returns an unregister function.
   */
  block: (blocker: Blocker) => () => void;
  go: (delta: number) => void;
  back: () => void;
  forward: () => void;
};

/**
 * routing itself
 */
export type Routing<Path extends string> = {
  path: Path;
  match: (pathname: string) => boolean;
  render: (loc: Location) => ReactNode;
  buildUrl: (args: PathParser<Path>) => string;
  extractParams: (location: Location) => PathParser<Path>;
};
