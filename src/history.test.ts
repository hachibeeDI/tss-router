import {describe, expect, test, beforeEach, vi} from 'vitest';

import {createBrowserHistory, createMemoryHistory} from './history';

describe('createMemoryHistory', () => {
  test('starts at "/" by default', () => {
    const h = createMemoryHistory();
    expect(h.index).toBe(0);
    expect(h.location.pathname).toBe('/');
    expect(h.location.search).toBe('');
    expect(h.location.hash).toBe('');
    expect(h.action).toBe('POP');
  });

  test('initialEntries seeds the stack and initialIndex selects the active entry', () => {
    const h = createMemoryHistory({
      initialEntries: ['/a', '/b', '/c'],
      initialIndex: 1,
    });
    expect(h.index).toBe(1);
    expect(h.location.pathname).toBe('/b');
    expect(h.entries.map((e) => e.pathname)).toEqual(['/a', '/b', '/c']);
  });

  test('parses pathname, search, and hash from string entries', () => {
    const h = createMemoryHistory({initialEntries: ['/users/1?q=a#section']});
    expect(h.location.pathname).toBe('/users/1');
    expect(h.location.search).toBe('?q=a');
    expect(h.location.hash).toBe('#section');
  });

  test('accepts object To values', () => {
    const h = createMemoryHistory({initialEntries: [{pathname: '/x', search: '?y=1'}]});
    expect(h.location.pathname).toBe('/x');
    expect(h.location.search).toBe('?y=1');
    expect(h.location.hash).toBe('');
  });

  test('push appends and increments index, action becomes PUSH', () => {
    const h = createMemoryHistory();
    h.push('/a');
    expect(h.index).toBe(1);
    expect(h.location.pathname).toBe('/a');
    expect(h.action).toBe('PUSH');

    h.push('/b');
    expect(h.index).toBe(2);
    expect(h.location.pathname).toBe('/b');
  });

  test('replace swaps the current entry without changing the index', () => {
    const h = createMemoryHistory({initialEntries: ['/a']});
    h.push('/b');
    expect(h.index).toBe(1);

    h.replace('/c');
    expect(h.index).toBe(1);
    expect(h.location.pathname).toBe('/c');
    expect(h.action).toBe('REPLACE');
    expect(h.entries.map((e) => e.pathname)).toEqual(['/a', '/c']);
  });

  test('back/forward move through the stack and emit POP', () => {
    const h = createMemoryHistory();
    h.push('/a');
    h.push('/b');
    expect(h.index).toBe(2);

    h.back();
    expect(h.index).toBe(1);
    expect(h.location.pathname).toBe('/a');
    expect(h.action).toBe('POP');

    h.forward();
    expect(h.index).toBe(2);
    expect(h.location.pathname).toBe('/b');
  });

  test('back at index 0 and forward at the tail are no-ops', () => {
    const h = createMemoryHistory();
    h.back();
    expect(h.index).toBe(0);

    h.push('/a');
    h.forward();
    expect(h.index).toBe(1);
  });

  test('push truncates forward entries (browser-like)', () => {
    const h = createMemoryHistory({initialEntries: ['/a', '/b', '/c'], initialIndex: 0});
    h.push('/x');
    expect(h.entries.map((e) => e.pathname)).toEqual(['/a', '/x']);
    expect(h.index).toBe(1);
  });

  test('listen receives updates and unsubscribe stops them', () => {
    const h = createMemoryHistory();
    const seen: Array<string> = [];
    const unsub = h.listen((update) => {
      seen.push(`${update.action}:${update.location.pathname}`);
    });

    h.push('/a');
    h.replace('/b');
    h.back();

    unsub();
    h.push('/c');

    expect(seen).toEqual(['PUSH:/a', 'REPLACE:/b', 'POP:/']);
  });

  test('each navigation generates a fresh location key', () => {
    const h = createMemoryHistory();
    const initialKey = h.location.key;
    h.push('/a');
    expect(h.location.key).not.toBe(initialKey);
    const aKey = h.location.key;
    h.push('/b');
    expect(h.location.key).not.toBe(aKey);
  });

  test('block intercepts push and pauses navigation until retry', () => {
    const h = createMemoryHistory();
    const transitions: Array<{action: string; pathname: string}> = [];
    h.block((tx) => {
      transitions.push({action: tx.action, pathname: tx.location.pathname});
    });

    h.push('/blocked');
    // Push was intercepted — current location and stack unchanged
    expect(h.location.pathname).toBe('/');
    expect(h.entries.length).toBe(1);
    expect(transitions).toEqual([{action: 'PUSH', pathname: '/blocked'}]);
  });

  test('block also intercepts replace and POP (back/forward)', () => {
    const h = createMemoryHistory({initialEntries: ['/a', '/b'], initialIndex: 1});
    const seen: Array<string> = [];
    h.block((tx) => {
      seen.push(`${tx.action}:${tx.location.pathname}`);
    });

    h.replace('/swap');
    expect(h.location.pathname).toBe('/b');

    h.back();
    expect(h.location.pathname).toBe('/b');
    expect(h.index).toBe(1);

    expect(seen).toEqual(['REPLACE:/swap', 'POP:/a']);
  });

  test('retry performs the pending navigation exactly once, then the blocker re-engages', () => {
    const h = createMemoryHistory();
    let calls = 0;
    h.block((tx) => {
      calls += 1;
      if (calls === 1) {
        tx.retry();
      }
      // second call: don't retry — should stay put
    });

    h.push('/first');
    expect(h.location.pathname).toBe('/first');
    expect(calls).toBe(1);

    h.push('/second');
    expect(h.location.pathname).toBe('/first');
    expect(calls).toBe(2);
  });

  test('block returns an unregister function that restores normal navigation', () => {
    const h = createMemoryHistory();
    const blocker = vi.fn();
    const unblock = h.block(blocker);

    unblock();
    h.push('/free');
    expect(h.location.pathname).toBe('/free');
    expect(blocker).not.toHaveBeenCalled();
  });

  test('registering a new blocker replaces the previous one', () => {
    const h = createMemoryHistory();
    const first = vi.fn();
    const second = vi.fn();
    h.block(first);
    h.block(second);

    h.push('/x');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('createBrowserHistory', () => {
  beforeEach(() => {
    // jsdom keeps state between tests; reset to a known origin
    window.history.replaceState(null, '', '/');
  });

  test('reads the current URL on creation', () => {
    window.history.replaceState(null, '', '/start?x=1#h');
    const h = createBrowserHistory();
    expect(h.location.pathname).toBe('/start');
    expect(h.location.search).toBe('?x=1');
    expect(h.location.hash).toBe('#h');
  });

  test('push updates window.location and notifies listeners', () => {
    const h = createBrowserHistory();
    const seen: Array<string> = [];
    h.listen((update) => {
      seen.push(`${update.action}:${update.location.pathname}`);
    });

    h.push('/users/1');
    expect(window.location.pathname).toBe('/users/1');
    expect(h.location.pathname).toBe('/users/1');
    expect(seen).toEqual(['PUSH:/users/1']);
  });

  test('replace does not push a new entry', () => {
    const h = createBrowserHistory();
    const before = window.history.length;
    h.replace('/replaced');
    expect(window.location.pathname).toBe('/replaced');
    expect(window.history.length).toBe(before);
    expect(h.action).toBe('REPLACE');
  });

  test('popstate fires listeners with action POP', () => {
    const h = createBrowserHistory();
    const seen: Array<string> = [];
    h.listen((update) => {
      seen.push(`${update.action}:${update.location.pathname}`);
    });

    window.history.replaceState(null, '', '/popped');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(seen).toEqual(['POP:/popped']);
  });

  test('block intercepts push and prevents the URL from changing', () => {
    const h = createBrowserHistory();
    const transitions: Array<{action: string; pathname: string}> = [];
    h.block((tx) => {
      transitions.push({action: tx.action, pathname: tx.location.pathname});
    });

    h.push('/blocked');
    expect(window.location.pathname).toBe('/');
    expect(h.location.pathname).toBe('/');
    expect(transitions).toEqual([{action: 'PUSH', pathname: '/blocked'}]);
  });

  test('retry on a blocked push performs the navigation', () => {
    const h = createBrowserHistory();
    h.block((tx) => {
      tx.retry();
    });

    h.push('/proceed');
    expect(window.location.pathname).toBe('/proceed');
    expect(h.location.pathname).toBe('/proceed');
  });
});
