import "vitest/globals";

declare global {
  type Mock<
    TArgs extends readonly unknown[] = unknown[],
    TReturn = unknown,
  > = import("vitest").Mock<TArgs, TReturn>;
  type MockInstance<
    TArgs extends readonly unknown[] = unknown[],
    TReturn = unknown,
  > = import("vitest").MockInstance<TArgs, TReturn>;
}

export {};
