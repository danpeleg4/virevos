const CHAIN_METHODS = [
  "from",
  "innerJoin",
  "leftJoin",
  "rightJoin",
  "fullJoin",
  "where",
  "groupBy",
  "having",
  "orderBy",
  "limit",
  "offset",
] as const;

export type DrizzleSelectChain<T = unknown> = {
  [K in (typeof CHAIN_METHODS)[number]]: Mock;
} & PromiseLike<T[]>;

export function buildSelectChain<T = unknown>(rows: T[]): DrizzleSelectChain<T> {
  const chain = {} as DrizzleSelectChain<T>;
  const passthrough = vi.fn(() => chain);
  for (const method of CHAIN_METHODS) {
    chain[method] = passthrough;
  }
  (chain as { then: PromiseLike<T[]>["then"] }).then = (onFulfilled, onRejected) =>
    Promise.resolve(rows).then(onFulfilled, onRejected);
  return chain;
}
