export interface RawImage {
  width: number;
  height: number;
  /** 4 = RGBA with opaque alpha (what a canvas hands back, kept as is). */
  channels: 1 | 3 | 4;
  pixels: Uint8Array;
}

export interface EncodedJpeg {
  bytes: Uint8Array;
  channels: 1 | 3;
}

/** Decode/encode only; resampling is pure JS so it is identical everywhere. */
export interface ImageCodec {
  /**
   * `size`, when given, is the size the caller will resample to: a codec may
   * decode straight to it (so a large image is never held at full size) or
   * return the full-size image.
   */
  decodeJpeg(
    bytes: Uint8Array,
    size?: { width: number; height: number },
  ): Promise<RawImage>;
  encodeJpeg(image: RawImage, quality: number): Promise<EncodedJpeg>;
}
