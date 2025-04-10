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

type PathMatcher = {
  match: (pathname: string) => boolean;
};

/**
 * routing itself
 */
export type Routing<Path extends string> = {
  path: Path;
  match: (pathname: string) => boolean;
  render: (args: PathParser<Path>) => ReactNode;
  buildUrl: (args: PathParser<Path>) => string;
};
