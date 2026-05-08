# Why tss-router?

There are many React routers. tss-router exists for a specific niche: you
write your routes in TypeScript and want the compiler to catch every link,
navigation, and parameter mismatch — without giving up the fluent, code-first
style.

## The design in one paragraph

A path string is parsed at the type level. `'/users/:id?tab=tab'` produces
`{id: string; $search: Partial<{tab: string}>}`. The same parser drives the
render function, the `Link` component's `params` prop, and `useNavigate`. There
is one source of truth (the path string), and it lives next to the component
that renders it.

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
