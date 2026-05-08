# Why tss-router?

There are many React routers. tss-router exists for a specific niche: you
write your routes in TypeScript and want the compiler to catch every link,
navigation, and parameter mismatch — without giving up the fluent, code-first
style.

## Four pillars

Everything in this library follows from four ideas.

### Code-first

Routes are values composed in TypeScript with a fluent builder, not JSX
elements or file-system conventions. The path string is written once, next to
the component that renders it, and every other touch point (links,
navigation, params) is derived from it.

### Type-safe by construction

A path string like `/users/:id?tab=tab` is parsed at the type level into
`{id: string; $search: Partial<{tab: string}>}`. The same parser drives the
render function, `<Link>`, and `useNavigate`. Forgetting a param or typo-ing a
key is a compile error — never a runtime surprise.

### Simple API

`route(...)` to start a router, `.at(...)` to add routes, `.group(...)` to
compose them, `routingHooksFactory(router)` for `Link` / `useNavigate` /
`useRedirect`. Plus `useRouter`, `useLocation`, `useHistory`. That's the
whole public surface.

### Tiny and readable

Under 700 lines of source across four files, with zero runtime dependencies
(the browser/memory history is internal). When the docs aren't enough,
reading the source is a realistic option — not a fallback you dread.

## Source of truth

Pick any param. Where does its type come from? It comes from one place: the
path string. The render function, the `Link` props, and `useNavigate` all
read from the same `PathParser<Path>`. There's no separate route schema, no
codegen output, no JSON config to keep in sync.

## What it is not

- **Not a data router.** No loaders, no actions. The render function gets
  params; you decide how to fetch.
- **Not nested in JSX.** Routes are values, not elements. Composition happens
  through `.group(...)` and a single `useRouter(router)` call.
- **Not a server router.** This is a client-side router for SPAs.

## Comparison

| Feature | tss-router | React Router | TanStack Router | Chicane |
| --- | --- | --- | --- | --- |
| Type-safe params | ✅ structural inference from path string | partial / via codegen | ✅ via codegen / file-based | ✅ functional pattern matching |
| Runtime deps | none | several | several | none |
| API style | fluent builder | nested `<Route>` JSX or config object | file-based or config | functional pattern matching |
| Bundle size | tiny | moderate | moderate | small |
| Data fetching | none (out of scope) | ✅ | ✅ | none |

If you want loaders, async transitions, route-level code splitting baked in,
reach for React Router or TanStack Router. If you want a small router that
makes routing values type-safe and stays out of your way, tss-router is a good
fit.

## When to pick something else

- You need data routing primitives (loaders / actions).
- You're SSR-first with hydration and route-level code splitting.
- You prefer file-based routing with codegen.
