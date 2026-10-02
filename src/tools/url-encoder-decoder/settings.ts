import { createToolSettings } from '@/shared/lib/tool-settings';
import type { CodecId } from './lib/codecs';

export interface TextEncoderSettings {
  codec: CodecId;
  direction: 'encode' | 'decode';
  perLine: boolean;
}

export const TEXT_ENCODER_DEFAULTS: TextEncoderSettings = {
  codec: 'url-component',
  direction: 'encode',
  perLine: false,
};

/** Codec, direction and batch toggle (spec §8.3); never the text. */
export const textEncoderSettings = createToolSettings<TextEncoderSettings>(
  'url-encoder-decoder',
  TEXT_ENCODER_DEFAULTS,
  { version: 1 },
);
