import { base32 } from './base32';
import type { Codec, CodecId } from './codec';
import { hex } from './hex';
import { html } from './html';
import { jsonString, jsString } from './js';
import { punycode } from './punycode';
import { quotedPrintable } from './qp';
import { unicode } from './unicode';
import { form, urlComponent, urlFull } from './url';

export {
  CodecError,
  decodeUntilStable,
  perLine,
  type Codec,
  type CodecId,
} from './codec';

/** Every Text Encoder codec, in menu order (spec §8.3). */
export const CODECS: readonly Codec[] = [
  urlComponent,
  urlFull,
  form,
  html,
  unicode,
  jsString,
  jsonString,
  punycode,
  hex,
  base32,
  quotedPrintable,
];

export const getCodec = (id: CodecId): Codec =>
  CODECS.find((c) => c.id === id) ?? urlComponent;

export const isCodecId = (id: unknown): id is CodecId =>
  CODECS.some((c) => c.id === id);
