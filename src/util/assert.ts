export function assert(invariant: any, message?: string): asserts invariant {
  if (!invariant) {
    throw new Error(message ?? "AssertionError");
  }
}