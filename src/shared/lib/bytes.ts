/** A view that owns its whole ArrayBuffer, so the buffer can be transferred. */
export function ownBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength &&
    bytes.buffer instanceof ArrayBuffer
    ? (bytes as Uint8Array<ArrayBuffer>)
    : bytes.slice();
}
