# Path & search params

A path pattern in tss-router has two halves separated by `?`:

```text
/users/:userId/posts/:postId?tab=tab&sort=sort
└──────── path side ─────────┘└─── query template ───┘
```

The path side declares positional parameters; the query template enumerates
the optional search keys you intend to read.

## Path placeholders

Any segment beginning with `:` becomes a required parameter.

```ts
.at('post', '/users/:userId/posts/:postId', (params) => {
  // params: {userId: string; postId: string}
  return <div>{params.userId} / {params.postId}</div>;
});
```

- Placeholders match exactly one segment (i.e. anything between two slashes).
- Values are URL-encoded when building URLs and decoded when extracting params.
- There are no wildcards (`*`) or splat parameters.

```ts
router.buildUrl('post', {userId: 'a/b', postId: '日本語'});
// => "/users/a%2Fb/posts/%E6%97%A5%E6%9C%AC%E8%AA%9E"
```

## Query template

The `?...` portion of the path declares which search keys exist. The keys are
the only thing that matters — the values you write after `=` are placeholder
text and are ignored at runtime.

```ts
.at('search', '/products?query=q&category=cat&sort=s', (params) => {
  // params: {$search: Partial<{query: string; category: string; sort: string}>}
  return <div>{params.$search.query ?? '(none)'}</div>;
});
```

`$search` is **always `Partial<...>`** — every key is optional, regardless of
how you write the template. This matches reality: a user can edit the URL by
hand, and the router can't enforce that all keys are present.

### Building search URLs

`URLSearchParams` does the encoding. Nullish values are dropped, and a
search-less URL has no trailing `?`.

```ts
router.buildUrl('search', {$search: {query: 'shoes'}});
// => "/products?query=shoes"

router.buildUrl('search', {$search: {}});
// => "/products"

router.buildUrl('search', {$search: {query: 'a b', category: undefined}});
// => "/products?query=a+b"
```

### Reading search keys

When a route is rendered, search params are decoded automatically:

```ts
// URL: /products?query=hello%20world
params.$search.query; // "hello world"
```

Keys present in the URL but not declared in the template are still readable
at runtime — TypeScript just won't surface them. If you need a key, declare
it in the template.

## Reserved names

`$search` is the only reserved key. Don't name a path placeholder `$search`.

## Cheatsheet

| Pattern | Inferred params |
| --- | --- |
| `/` | `{}` |
| `/users` | `{}` |
| `/users/:id` | `{id: string}` |
| `/users/:id/posts/:postId` | `{id: string; postId: string}` |
| `/products?q=q` | `{$search: Partial<{q: string}>}` |
| `/users/:id?tab=tab` | `{id: string; $search: Partial<{tab: string}>}` |
