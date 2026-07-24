export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof bytes.toBase64 === "function") {
    return bytes.toBase64();
  }
  let binary = "";
  // Chunk to stay well under the argument-count limit of `String.fromCharCode`.
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[],
    );
  }
  return btoa(binary);
}
