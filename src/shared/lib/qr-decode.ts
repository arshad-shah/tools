import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { ToolError } from './errors';

/**
 * Barcode decoding (spec §9.10): the browser's BarcodeDetector when it reads
 * the requested formats, else zxing-wasm loaded lazily with its wasm served
 * from this origin (never the package's CDN default).
 */

/** Format names as BarcodeDetector spells them. */
export type BarcodeFormat =
  | 'qr_code'
  | 'micro_qr_code'
  | 'aztec'
  | 'data_matrix'
  | 'pdf417'
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'itf';

const ZXING_NAMES: Record<BarcodeFormat, string> = {
  qr_code: 'QRCode',
  micro_qr_code: 'MicroQRCode',
  aztec: 'Aztec',
  data_matrix: 'DataMatrix',
  pdf417: 'PDF417',
  ean_13: 'EAN13',
  ean_8: 'EAN8',
  upc_a: 'UPCA',
  upc_e: 'UPCE',
  code_128: 'Code128',
  code_39: 'Code39',
  code_93: 'Code93',
  codabar: 'Codabar',
  itf: 'ITF',
};

export const ALL_FORMATS = Object.keys(ZXING_NAMES) as BarcodeFormat[];

/** Human labels for results. */
export const FORMAT_LABELS: Record<BarcodeFormat, string> = {
  qr_code: 'QR Code',
  micro_qr_code: 'Micro QR Code',
  aztec: 'Aztec',
  data_matrix: 'Data Matrix',
  pdf417: 'PDF417',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code_128: 'Code 128',
  code_39: 'Code 39',
  code_93: 'Code 93',
  codabar: 'Codabar',
  itf: 'ITF',
};

export interface Point {
  x: number;
  y: number;
}

export interface DecodedBarcode {
  format: BarcodeFormat;
  text: string;
  bytes?: Uint8Array;
  /** Axis-aligned box in source pixels. */
  box: { x: number; y: number; w: number; h: number };
  /** Top-left, top-right, bottom-right, bottom-left. */
  corners?: Point[];
}

export type DecodeSource = ImageBitmap | ImageData | Blob;

export interface DecodeOptions {
  formats?: BarcodeFormat[];
}

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  cornerPoints?: Point[];
}

interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): {
    detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
  };
  getSupportedFormats(): Promise<string[]>;
}

const detectorCtor = (): BarcodeDetectorCtor | undefined =>
  (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

/** `?decoder=zxing` forces the wasm path in development (e2e coverage). */
function forcedZxing(): boolean {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('decoder') === 'zxing';
}

/** True when BarcodeDetector exists and reads every format asked for. */
export async function isBarcodeDetectorUsable(
  formats: BarcodeFormat[] = ['qr_code'],
): Promise<boolean> {
  const Ctor = detectorCtor();
  if (!Ctor || forcedZxing()) return false;
  try {
    const supported = await Ctor.getSupportedFormats();
    return formats.every((f) => supported.includes(f));
  } catch {
    return false;
  }
}

const isFormat = (f: string): f is BarcodeFormat => f in ZXING_NAMES;

function boxOf(points: Point[]): DecodedBarcode['box'] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

async function withDetector(
  Ctor: BarcodeDetectorCtor,
  source: DecodeSource,
  formats: BarcodeFormat[],
): Promise<DecodedBarcode[]> {
  const input =
    source instanceof Blob ? await createImageBitmap(source) : source;
  try {
    const found = await new Ctor({ formats }).detect(input);
    return found
      .filter((d) => isFormat(d.format))
      .map((d) => ({
        format: d.format as BarcodeFormat,
        text: d.rawValue,
        box: {
          x: d.boundingBox.x,
          y: d.boundingBox.y,
          w: d.boundingBox.width,
          h: d.boundingBox.height,
        },
        corners: d.cornerPoints?.map((p) => ({ x: p.x, y: p.y })),
      }));
  } finally {
    if (input !== source && 'close' in input) input.close();
  }
}

type ZxingReader = typeof import('zxing-wasm/reader');
let zxing: Promise<ZxingReader> | null = null;

/** The wasm URL handed to zxing: this origin's asset, whatever it asks for. */
export const zxingLocateFile = (path: string, prefix: string): string =>
  path.endsWith('.wasm') ? wasmUrl : prefix + path;

function loadZxing(): Promise<ZxingReader> {
  zxing ??= import('zxing-wasm/reader')
    .then(async (mod) => {
      await mod.prepareZXingModule({
        overrides: { locateFile: zxingLocateFile },
        fireImmediately: true,
      });
      return mod;
    })
    .catch((cause: unknown) => {
      zxing = null;
      throw new ToolError('UNKNOWN', 'Could not load the barcode decoder', {
        cause,
      });
    });
  return zxing;
}

const FROM_ZXING = new Map(
  Object.entries(ZXING_NAMES).map(([k, v]) => [v, k as BarcodeFormat]),
);

function toImageData(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ToolError('UNKNOWN', 'Could not read this image');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

async function withZxing(
  source: DecodeSource,
  formats: BarcodeFormat[],
): Promise<DecodedBarcode[]> {
  const mod = await loadZxing();
  const input =
    source instanceof Blob || source instanceof ImageData
      ? source
      : toImageData(source);
  const results = await mod.readBarcodes(input, {
    formats: formats.map((f) => ZXING_NAMES[f]) as never,
    tryHarder: true,
    maxNumberOfSymbols: 16,
  });
  return results
    .filter((r) => r.isValid && FROM_ZXING.has(r.format))
    .map((r) => {
      const p = r.position;
      const corners = [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft].map(
        (c) => ({ x: c.x, y: c.y }),
      );
      return {
        format: FROM_ZXING.get(r.format) as BarcodeFormat,
        text: r.text,
        bytes: r.bytes,
        box: boxOf(corners),
        corners,
      };
    });
}

/** Every code found in the image (none is an empty list, not an error). */
export async function decodeBarcodes(
  source: DecodeSource,
  { formats = ALL_FORMATS }: DecodeOptions = {},
): Promise<DecodedBarcode[]> {
  try {
    const Ctor = detectorCtor();
    if (Ctor && (await isBarcodeDetectorUsable(formats)))
      return await withDetector(Ctor, source, formats);
    return await withZxing(source, formats);
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw new ToolError('INVALID_FILE', 'Could not read this image', { cause });
  }
}
