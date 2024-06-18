export function assert(invariant: unknown, message?: string): asserts invariant {
  if (!invariant) {
    throw new Error(message ?? "AssertionError");
  }
}
