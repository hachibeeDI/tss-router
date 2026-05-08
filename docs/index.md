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
  - icon: 🧷
    title: Type-safe by construction
    details: Path placeholders and query templates are parsed at the type level, so navigation, links, and route renderers all share the same param shape.
  - icon: 🪶
    title: Lightweight
    details: Zero runtime dependencies. Ships its own browser/memory history implementation — no `history` package needed.
  - icon: 🧱
    title: Code-first
    details: Routes are defined with a fluent builder. No JSX route trees, no codegen, no separate config file.
  - icon: 🧪
    title: Testable
    details: Memory history makes it trivial to drive the router from tests without a browser.
---
