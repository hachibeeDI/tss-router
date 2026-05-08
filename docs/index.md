---
layout: home

hero:
  name: 'tss-router'
  text: 'Type-safe routing for React'
  tagline: A small, code-first router with strong type inference for path and search parameters.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/hachibeeDI/tss-router

features:
  - icon: 🧱
    title: Code-first
    details: Define routes in TypeScript with a fluent builder. No JSX route trees, no file-based conventions, no codegen step.
  - icon: 🧷
    title: Type-safe by construction
    details: Path placeholders and `?key=...` templates are parsed at the type level. Links, navigation, and renderers all share the same inferred params.
  - icon: 🎯
    title: Simple API
    details: One factory, one `.at(...)`, one `.group(...)`, a handful of hooks. The whole surface fits on a single page.
  - icon: 🪶
    title: Tiny and readable
    details: Under 700 lines of source. Zero runtime dependencies. Open the repo and read the whole thing in a coffee break.
---

## Why tss-router

tss-router is built around four ideas. They show up everywhere — in the API, the implementation, and the docs.

- **Code-first.** Routes are values you compose in TypeScript. No JSX `<Route>` trees to wire up, no file-based magic, no codegen pipeline. The path string you write is the source of truth.
- **Type-safe by construction.** A path like `/users/:id?tab=tab` is a type — TypeScript parses placeholders and the query template, then propagates the param shape to every link, navigation call, and renderer. Mismatches are compile errors, not runtime bugs.
- **Simple API.** `route` to start, `.at` to add, `.group` to compose, `routingHooksFactory` for `Link` / `useNavigate` / `useRedirect`. There's no nested context tree, no `<Outlet />`, no loaders. You can hold the whole surface in your head.
- **Tiny and readable.** The implementation is under 700 lines of source with no runtime dependencies — including the browser/memory history. When something is unclear, opening the source is a real option, not a desperate measure.

If you only need one of these, you have plenty of choices. If you want all four, that's the gap tss-router fills.
