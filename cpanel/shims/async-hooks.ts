/**
 * Browser shim for `node:async_hooks`, used only by the cPanel static build.
 * TanStack Start's client runtime touches AsyncLocalStorage at startup; the
 * browser has no such module, so this provides a minimal compatible class.
 */
export class AsyncLocalStorage {
  #store;
  getStore() {
    return this.#store;
  }
  run(store, callback, ...args) {
    const previous = this.#store;
    this.#store = store;
    try {
      return callback(...args);
    } finally {
      this.#store = previous;
    }
  }
  exit(callback, ...args) {
    const previous = this.#store;
    this.#store = undefined;
    try {
      return callback(...args);
    } finally {
      this.#store = previous;
    }
  }
  enterWith(store) {
    this.#store = store;
  }
  disable() {
    this.#store = undefined;
  }
}

export default { AsyncLocalStorage };
