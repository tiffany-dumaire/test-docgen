/** Retire les clés dont la valeur est `undefined` (utile pour les payloads d'écriture). */
export function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/** Applique un sérialiseur `fromApi` à chaque élément d'un tableau (ou undefined). */
export function mapArray<A, B>(arr: A[] | undefined | null, fn: (a: A) => B): B[] | undefined {
  return arr ? arr.map(fn) : undefined;
}

/** Sérialise une réponse paginée DRF : convertit chaque élément de `results`. */
export function serializePaginated<A, B>(
  page: { count: number; next: string | null; previous: string | null; results: A[] },
  fn: (a: A) => B,
): { count: number; next: string | null; previous: string | null; results: B[] } {
  return { ...page, results: page.results.map(fn) };
}
