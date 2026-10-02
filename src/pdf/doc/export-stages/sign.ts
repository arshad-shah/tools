import { ToolError } from '@/shared/lib/errors';
import type { SigningIdentity } from '@/pdf/sign/pades/pkcs12';
import type {
  ExportContext,
  ExportOptions,
  ExportStage,
} from '../export-stages';
import { signatureAssets, type SignPlaceParams } from '../ops/sign-params';
import { protectionOf } from '../ops/protect';
import type { OpId } from '../types';
import { SIGN_AND_PROTECT_MESSAGE } from './encrypt';

/**
 * The Export dialog's digital signature choice (plan H-11). In memory for
 * one dialog session only; the identity's key never enters the op log,
 * autosave, settings or logs (G25), and the dialog drops it afterwards.
 */
export interface SignatureExportOption {
  identity: SigningIdentity;
  /** A sign.place op used as the visible appearance (left out of page content); null = invisible. */
  placementOpId: OpId | null;
  reason: string;
  location: string;
  caption: boolean;
  /** null = the device clock (the UI says so). */
  timestampUrl: string | null;
  summaryPage: boolean;
}

export const signatureOption = (o: ExportOptions) =>
  (o.signature as SignatureExportOption | null | undefined) ?? null;

/** Overlay ops the signature draws itself (its appearance). */
export const excludedOverlays = (o: ExportOptions): OpId[] => {
  const s = signatureOption(o);
  return s?.placementOpId ? [s.placementOpId] : [];
};

/** A cheap check for existing signatures in raw bytes. */
export function hasSignatures(bytes: Uint8Array): boolean {
  const needle = [0x2f, 0x42, 0x79, 0x74, 0x65, 0x52, 0x61, 0x6e, 0x67, 0x65]; // "/ByteRange"
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let k = 0; k < needle.length; k++)
      if (bytes[i + k] !== needle[k]) continue outer;
    return true;
  }
  return false;
}

export const SIGN_ONLY_KEPT =
  'The document was already signed, so it was signed again without other changes and the earlier signatures stay valid.';

/**
 * True when only the chosen signature placement changed an already signed
 * document and no option rewrites the file: then the original bytes are
 * signed incrementally and earlier signatures stay valid (G17).
 */
function signOnly(ctx: ExportContext, original: Uint8Array): boolean {
  const s = signatureOption(ctx.options)!;
  const { log, cursor } = ctx.model.getState();
  return (
    hasSignatures(original) &&
    log.slice(0, cursor).every((op) => op.id === s.placementOpId) &&
    !ctx.options.stripMetadata &&
    ctx.options.linearize !== true &&
    ctx.options.onlyPages === null
  );
}

const placementOf = (ctx: ExportContext, id: OpId | null) => {
  if (!id) return null;
  const op = ctx.model
    .getState()
    .log.slice(0, ctx.model.getState().cursor)
    .find((o) => o.id === id && o.type === 'sign.place');
  if (!op)
    throw new ToolError(
      'INVALID_INPUT',
      'The signature chosen for the appearance is no longer in the document',
    );
  return op.params as SignPlaceParams;
};

/** Signs the exported bytes last (order 100), after every other stage. */
export const signStage: ExportStage = {
  id: 'sign',
  order: 100,
  applies: (ctx) => signatureOption(ctx.options) !== null,
  async run(bytes, ctx) {
    const s = signatureOption(ctx.options)!;
    if (protectionOf(ctx.view)?.enabled)
      throw new ToolError('INVALID_INPUT', SIGN_AND_PROTECT_MESSAGE);
    const blobs = ctx.blobs;
    if (!blobs)
      throw new ToolError('UNKNOWN', 'The document bytes are not available');
    const state = ctx.model.getState();
    const original = await blobs.checkpointBytes(state.checkpoints[0].id);
    const only = signOnly(ctx, original);
    const place = placementOf(ctx, s.placementOpId);
    const pages = ctx.view.pages.filter(
      (p) => !ctx.options.onlyPages || ctx.options.onlyPages.includes(p.id),
    );
    const pageIndex = place
      ? pages.findIndex((p) => p.id === place.pageId)
      : -1;
    if (place && pageIndex < 0)
      throw new ToolError(
        'INVALID_INPUT',
        "The signature's page is not in this export",
      );
    const assets: Record<string, Uint8Array> = {};
    if (place)
      for (const a of signatureAssets(place.content))
        assets[a] = await blobs.assetBytes(a);

    let input = only ? original : bytes;
    if (only) ctx.warnings.push(SIGN_ONLY_KEPT);
    const m = new Date();
    const [{ signWithIdentity }, { requestTimestamp }] = await Promise.all([
      import('@/pdf/sign/pades/sign-flow'),
      import('@/pdf/sign/pades/tsa'),
    ]);
    if (s.summaryPage && !only) {
      const { sha256 } = await import('@noble/hashes/sha2.js');
      const { toHex } = await import('@/pdf/sign/pades/syntax');
      input = await ctx.services.edit.call(
        'appendSummaryPage',
        [
          input.slice(),
          {
            documentName: ctx.options.filename,
            pagesSigned: pages.length,
            signerName: s.identity.info.subjectCN,
            signerInfo: s.identity.info,
            locations: place ? [pageIndex + 1] : [],
            time: m,
            timeSource: s.timestampUrl ? 'timestamp-requested' : 'device-clock',
            timestampUrl: s.timestampUrl ?? undefined,
            preSignSha256: toHex(sha256(input)),
          },
        ],
        { signal: ctx.signal },
      );
    }
    const url = s.timestampUrl;
    return signWithIdentity({
      identity: s.identity,
      request: {
        bytes: input,
        placement: place
          ? {
              pageIndex,
              rect: place.rect,
              rotate: place.rotate,
              visual: place.content,
            }
          : null,
        assets,
        reason: s.reason.trim() || undefined,
        location: s.location.trim() || undefined,
        m,
        caption: s.caption,
        captionDate: new Intl.DateTimeFormat(undefined, {
          dateStyle: 'long',
          timeStyle: 'short',
        }).format(m),
        name: s.identity.info.subjectCN,
        contentsBytes: url ? 32768 : 16384,
      },
      prepare: (req) =>
        ctx.services.edit.call(
          'prepareSignature',
          [{ ...req, bytes: req.bytes.slice() }],
          {
            signal: ctx.signal,
          },
        ),
      verify: (b) =>
        ctx.services.edit.call('verifySignatures', [b.slice(), []], {
          signal: ctx.signal,
        }),
      timestamp: url
        ? (v) => requestTimestamp(v, { url, signal: ctx.signal })
        : undefined,
    });
  },
};
