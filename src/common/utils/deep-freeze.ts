/**
 * Recursively applies `Object.freeze` to plain objects and arrays so configuration trees
 * cannot be mutated at runtime. Returns the same reference (same contract as `Object.freeze`).
 *
 * - Primitives, `null`, and `undefined` are returned unchanged.
 * - Values that are already deeply frozen at the root of a subtree are skipped quickly via `Object.isFrozen`.
 * - Non-plain objects (e.g. `Date`, `Map`, `RegExp`, typed arrays) are left unchanged so callers are not surprised and nothing throws.
 * - Cyclic references between plain objects/arrays are handled without infinite recursion.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const root = value as object;

  if (Object.isFrozen(root)) {
    return value;
  }

  if (!isPlainObjectOrArray(root)) {
    return value;
  }

  const visiting = new WeakSet();

  function freezeDeep(o: object): void {
    if (Object.isFrozen(o)) {
      return;
    }

    if (!isPlainObjectOrArray(o)) {
      return;
    }

    if (visiting.has(o)) {
      return;
    }

    visiting.add(o);

    for (const key of Reflect.ownKeys(o)) {
      let child: unknown;
      try {
        child = Reflect.get(o, key);
      } catch {
        continue;
      }

      if (child !== null && typeof child === "object") {
        freezeDeep(child);
      }
    }

    visiting.delete(o);
    Object.freeze(o);
  }

  freezeDeep(root);
  return value;
}

function isPlainObjectOrArray(value: object): boolean {
  return Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]";
}
