/**
 * Polyfills required by modern pdf.js on browsers that lack
 * Map.prototype.getOrInsertComputed (Chrome < 142-ish / Safari / older Electron).
 */

export function ensurePdfRuntimePolyfills(): void {
  if (typeof Map !== 'undefined' && typeof Map.prototype.getOrInsertComputed !== 'function') {
    Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
      value(this: Map<unknown, unknown>, key: unknown, callbackFn: (key: unknown) => unknown) {
        if (this.has(key)) return this.get(key)
        const value = callbackFn(key)
        this.set(key, value)
        return value
      },
      writable: true,
      configurable: true,
    })
  }

  if (typeof Map !== 'undefined' && typeof Map.prototype.getOrInsert !== 'function') {
    Object.defineProperty(Map.prototype, 'getOrInsert', {
      value(this: Map<unknown, unknown>, key: unknown, defaultValue: unknown) {
        if (this.has(key)) return this.get(key)
        this.set(key, defaultValue)
        return defaultValue
      },
      writable: true,
      configurable: true,
    })
  }

  if (
    typeof Promise !== 'undefined' &&
    typeof Promise.withResolvers !== 'function'
  ) {
    Promise.withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }
}
