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

/**
 * expect History.Location but you can use any compatible alternatives
 */
export type Location = Path & {
  state: unknown;
  key: string;
};

type To = string | Partial<Path>;

type HistoryActions = 'PUSH' | 'REPLACE' | 'POP';

/**
 * A change to the current location.
 */
type Update = {
  /**
   * The action that triggered the change.
   */
  action: HistoryActions;
  /**
   * The new location.
   */
  location: Location;
};

/**
 * Assum remix-run/history, but you can choose any alternative.
 * Or write your wrapper.
 *
 * Looks like remix-run/history has bunch of unnecessary dependencies and is going to be obsolete.
 * Propbabry I need to make better solution with zero dependency.
 *
 * FIXME: Too awkward...
 */
export type History = {
  action: HistoryActions;
  location: Location;
  push: (to: To, state?: unknown) => void;
  replace: (to: To, state?: unknown) => void;
  listen: (listener: (location: Update) => void) => () => void;
  createHref(to: To): string;
  go(delta: number): void;
  back(): void;
  forward(): void;
  block(blocker: (tx: Update & {retry: VoidFunction}) => void): () => void;
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
