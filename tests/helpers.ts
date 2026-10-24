export function installBrowserGlobals() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
  const proxy = new Proxy(storage, {
    ownKeys: () => Array.from(store.keys()),
    getOwnPropertyDescriptor: (target, key) => (typeof key === 'string' && store.has(key)
      ? { enumerable: true, configurable: true, value: store.get(key) }
      : Reflect.getOwnPropertyDescriptor(target, key)),
  });
  const target = new EventTarget();
  const win = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };
  Object.assign(globalThis, { localStorage: proxy, window: win });
  return { storage: proxy, window: win };
}

export function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return handler(String(input), init);
  }) as typeof fetch;
  return calls;
}
