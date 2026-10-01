export interface RawImage {
  width: number;
  height: number;
  channels: 1 | 3;
  pixels: Uint8Array;
}

export interface EncodedJpeg {
  bytes: Uint8Array;
  channels: 1 | 3;
}

/** Decode/encode only; resampling is pure JS so it is identical everywhere. */
export interface ImageCodec {
  decodeJpeg(bytes: Uint8Array): Promise<RawImage>;
  encodeJpeg(image: RawImage, quality: number): Promise<EncodedJpeg>;
}
