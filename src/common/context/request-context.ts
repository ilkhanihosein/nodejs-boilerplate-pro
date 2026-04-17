import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextStore {
  readonly requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/** Run `fn` with request context (e.g. background work that should keep the same `requestId`). */
export function runWithContext<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

export function getRequestContext(): RequestContextStore | undefined {
  return storage.getStore();
}

/** Correlation id from AsyncLocalStorage (set by `bindRequestContext` from `ensureRequestId`). */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
