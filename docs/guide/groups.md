# Groups & layouts

`Router.group(...)` lets you share a path prefix and an optional layout
component across a set of routes. Both the key prefix and the path prefix are
combined with the inner routes.

## Prefix-only group

```tsx
const router = route('home', '/', () => <div>Home</div>)
  .group('admin/', '/admin', (g) =>
    g
      .at('dashboard', '/', () => <div>Admin Dashboard</div>)
      .at('users', '/users', () => <div>Admin Users</div>),
  );

// Registered keys: "home", "admin/dashboard", "admin/users"
// Registered paths: "/", "/admin", "/admin/users"
```

Inside `.group(keyPrefix, pathPrefix, fn)`, the inner `.at(key, path, render)`:

- Path is **appended** to `pathPrefix` (so `'/'` produces just the prefix).
- Key is **appended** to `keyPrefix` (so the call site uses the combined name).

You're free to use any separator in the key prefix (`'admin/'`, `'admin.'`,
etc.) — it's just string concatenation. The convention used in this project is
a slash, but it's purely cosmetic.

## Group with a layout

Pass an object instead of a function to attach a layout that wraps every route
in the group. The layout receives a context value, the path-prefix params, and
the inner `children`.

```tsx
const router = route('home', '/', () => <div>Home</div>)
  .group('users/', '/users/:userId', {
    layout: (ctx: {title: string}, params, children) => (
      <section>
        <h1>{ctx.title} (#{params.userId})</h1>
        {children}
      </section>
    ),
    render: (g) =>
      g
        .at('profile', '/profile', (p) => <div>Profile of {p.userId}</div>, {title: 'Profile'})
        .at(
          'posts',
          '/posts/:postId',
          (p) => <div>Post {p.postId} by {p.userId}</div>,
          (params) => ({title: `Post ${params.postId}`}),
        ),
  });
```

Notes:

- The path prefix can contain placeholders (`/:userId`). They're available in
  both the layout and the inner render function.
- The 4th argument of the inner `.at(...)` is the **context** the layout
  receives. It can be a value or a function `(params) => ctx`.
- If the group's layout type is `Ctx = undefined`, you can omit the context
  entirely.

## Why a context argument?

Layouts often need bits of information per route — page title, breadcrumb
label, action buttons. Threading that through render props gets noisy. The
context slot is a small, typed extension point.

## Limitations

- Groups don't currently support nested `.group(...)` calls. If you need
  deeper nesting, register the inner routes flat and build the prefix yourself
  (or open an issue describing your case).
- The layout always wraps every route in the group. If you need a route that
  *opts out* of the layout, register it outside the group instead.
