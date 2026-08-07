/** Cache en memoria del navegador: evita releer Firestore al navegar entre pantallas. */

type CacheEntry<T> = {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** 5 min: bastante para un torneo; los writes de admin invalidan. */
export const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;

export async function cachedFetch<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number = QUERY_CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit?.value !== undefined && hit.expiresAt > now) return hit.value;
  if (hit?.promise) return hit.promise;

  const promise = load().then(
    (value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    (err) => {
      const cur = store.get(key) as CacheEntry<T> | undefined;
      if (cur?.promise === promise) store.delete(key);
      throw err;
    }
  );
  store.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

/** Tras crear/editar partidos o jugadores, limpiar para la próxima lectura. */
export function invalidateQueryCache(...keys: string[]): void {
  if (keys.length === 0) {
    store.clear();
    return;
  }
  for (const key of keys) {
    store.delete(key);
  }
}
