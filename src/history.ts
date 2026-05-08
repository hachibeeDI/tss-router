import type {History, HistoryAction, Location, To, Update} from './types';

function createKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseTo(to: To, state: unknown = null): Location {
  let pathname = '';
  let search = '';
  let hash = '';

  if (typeof to === 'string') {
    let rest = to;
    const hashIdx = rest.indexOf('#');
    if (hashIdx >= 0) {
      hash = rest.slice(hashIdx);
      rest = rest.slice(0, hashIdx);
    }
    const searchIdx = rest.indexOf('?');
    if (searchIdx >= 0) {
      search = rest.slice(searchIdx);
      rest = rest.slice(0, searchIdx);
    }
    pathname = rest;
  } else {
    pathname = to.pathname ?? '';
    search = to.search ?? '';
    hash = to.hash ?? '';
  }

  return {pathname, search, hash, state, key: createKey()};
}

function formatLocation(loc: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  return `${loc.pathname}${loc.search}${loc.hash}`;
}

type StoredState = {key: string; state: unknown};

function readBrowserLocation(): Location {
  const stored = window.history.state as StoredState | null;
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: stored?.state ?? null,
    key: stored?.key ?? createKey(),
  };
}

export function createBrowserHistory(): History {
  let action: HistoryAction = 'POP';
  let location: Location = readBrowserLocation();
  const listeners = new Set<(update: Update) => void>();

  const notify = () => {
    const update: Update = {action, location};
    for (const l of listeners) {
      l(update);
    }
  };

  window.addEventListener('popstate', () => {
    action = 'POP';
    location = readBrowserLocation();
    notify();
  });

  return {
    get action() {
      return action;
    },
    get location() {
      return location;
    },
    push(to, state = null) {
      const next = parseTo(to, state);
      window.history.pushState({key: next.key, state} satisfies StoredState, '', formatLocation(next));
      action = 'PUSH';
      location = next;
      notify();
    },
    replace(to, state = null) {
      const next = parseTo(to, state);
      window.history.replaceState({key: next.key, state} satisfies StoredState, '', formatLocation(next));
      action = 'REPLACE';
      location = next;
      notify();
    },
    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    go(delta) {
      window.history.go(delta);
    },
    back() {
      window.history.back();
    },
    forward() {
      window.history.forward();
    },
  };
}

export type MemoryHistoryOptions = {
  initialEntries?: ReadonlyArray<To>;
  initialIndex?: number;
};

export type MemoryHistory = History & {
  readonly index: number;
  readonly entries: ReadonlyArray<Location>;
};

export function createMemoryHistory(options: MemoryHistoryOptions = {}): MemoryHistory {
  const initial = options.initialEntries ?? ['/'];
  const entries: Array<Location> = initial.map((to) => parseTo(to));
  let index = Math.max(0, Math.min(options.initialIndex ?? 0, entries.length - 1));
  let action: HistoryAction = 'POP';
  const listeners = new Set<(update: Update) => void>();

  const currentLocation = (): Location => {
    // biome-ignore lint/style/noNonNullAssertion: index is clamped to valid range
    return entries[index]!;
  };

  const notify = () => {
    const update: Update = {action, location: currentLocation()};
    for (const l of listeners) {
      l(update);
    }
  };

  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= entries.length) {
      return;
    }
    action = 'POP';
    index = next;
    notify();
  };

  return {
    get action() {
      return action;
    },
    get location() {
      return currentLocation();
    },
    get index() {
      return index;
    },
    get entries() {
      return entries;
    },
    push(to, state = null) {
      action = 'PUSH';
      const next = parseTo(to, state);
      // Drop any forward entries beyond the current index, mirroring browser behavior
      entries.splice(index + 1, entries.length - (index + 1), next);
      index += 1;
      notify();
    },
    replace(to, state = null) {
      action = 'REPLACE';
      entries[index] = parseTo(to, state);
      notify();
    },
    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    go,
    back() {
      go(-1);
    },
    forward() {
      go(1);
    },
  };
}
