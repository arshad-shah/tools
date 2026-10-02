import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  type PDFPage,
} from 'pdf-lib';
import { drawImage, drawPath, drawText, type Box } from '@/pdf/edit/draw';
import { rotationAbout, type Matrix } from '@/pdf/edit/draw-core';
import { drawSignatureText, uprightFrame } from '@/pdf/edit/draw-signature';
import { unsupportedChars } from '@/pdf/edit/fonts';
import { formatBlockDate, layoutBlock } from '@/pdf/sign/block';
import { fitVectorToBox } from '@/pdf/sign/ink';
import type {
  SignatureContent,
  SignBlockParams,
  SignInitialPagesParams,
  SignPlaceParams,
} from '../ops/fill-sign';
import { defineMaterializer, type MaterializeCtx } from './registry';

/** Printed lines of a signature block. */
const BLOCK_INK = '#000000';
const BLOCK_TEXT_SIZE = 11;

/** `outer` after `inner` (PDF matrix order: inner applies first). */
const compose = (o: Matrix, i: Matrix): Matrix => [
  o[0] * i[0] + o[2] * i[1],
  o[1] * i[0] + o[3] * i[1],
  o[0] * i[2] + o[2] * i[3],
  o[1] * i[2] + o[3] * i[3],
  o[0] * i[4] + o[2] * i[5] + o[4],
  o[1] * i[4] + o[3] * i[5] + o[5],
];

/**
 * Any signature content in `box` (the upright frame), turned by `rotate`
 * degrees counterclockwise about the box centre. Shared by placed
 * signatures, blocks and initials (and the digital signature appearance).
 */
export async function drawSignatureContent(
  ctx: MaterializeCtx,
  page: PDFPage,
  c: SignatureContent,
  box: Box,
  rotate: number,
): Promise<void> {
  if (c.kind === 'image')
    return drawImage(ctx.draw, page, ctx.asset(c.assetId), c.mime, box, {
      rotate,
    });
  if (c.kind === 'ink' || c.kind === 'trace') {
    const fitted = fitVectorToBox(c.vector, box);
    const transform = rotate
      ? compose(rotationAbout(box, rotate), fitted.transform)
      : fitted.transform;
    return drawPath(page, fitted.d, {
      fill: c.color,
      transform,
      evenOdd: c.kind === 'trace',
    });
  }
  await drawSignatureText(
    ctx.draw,
    page,
    {
      text: c.text,
      fontKey: c.fontId,
      fontBytes: ctx.asset(c.fontAsset),
      color: c.color,
      slant: c.slant,
      size: c.size,
    },
    box,
    rotate,
  );
}

export const writeSignature = defineMaterializer<SignPlaceParams>({
  type: 'sign.place',
  phase: 'signature',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    const { box, rotate } = uprightFrame(
      p.rect,
      page.getRotation().angle,
      p.rotate,
    );
    await drawSignatureContent(ctx, page, p.content, box, rotate);
  },
});

/** One printed line: Helvetica (or the Unicode font), shrunk to fit. */
async function drawLine(
  ctx: MaterializeCtx,
  page: PDFPage,
  text: string,
  box: Box,
): Promise<boolean> {
  const helvetica = await ctx.draw.fonts.get({ standard: 'Helvetica' });
  const font = unsupportedChars(helvetica, text).length
    ? ({ unicode: true } as const)
    : ({ standard: 'Helvetica' } as const);
  const fitted = await drawText(ctx.draw, page, text, box, {
    font,
    size: Math.min(BLOCK_TEXT_SIZE, box.height * 0.8),
    color: BLOCK_INK,
    fit: 'shrink',
    minSize: 6,
  });
  return fitted.truncated;
}

export const writeSignBlock = defineMaterializer<SignBlockParams>({
  type: 'sign.block',
  phase: 'signature',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    const { box, rotate } = uprightFrame(
      p.rect,
      page.getRotation().angle,
      p.rotate,
    );
    const c = p.content;
    const layout = layoutBlock(box, c);
    // The parts are laid out upright, then the whole block turns together.
    page.pushOperators(pushGraphicsState());
    if (rotate)
      page.pushOperators(
        concatTransformationMatrix(...rotationAbout(box, rotate)),
      );
    await drawSignatureContent(ctx, page, c.signature, layout.signature, 0);
    const lines: [string, Box | null][] = [
      [c.name.trim(), layout.name],
      [c.title.trim(), layout.title],
      [c.showDate ? formatBlockDate(c.dateIso, c.locale) : '', layout.date],
    ];
    let cut = false;
    for (const [text, at] of lines)
      if (text && at) cut = (await drawLine(ctx, page, text, at)) || cut;
    page.pushOperators(popGraphicsState());
    if (cut)
      ctx.note(
        `Text in a signature block on page ${ctx.doc.getPages().indexOf(page) + 1} was too long and was cut`,
      );
  },
});

export const writeInitialPages = defineMaterializer<SignInitialPagesParams>({
  type: 'sign.initialPages',
  phase: 'signature',
  async apply(ctx, p) {
    const { fx, fy, fw, fh } = p.anchor;
    for (const id of p.pageIds) {
      const page = ctx.page(id);
      if (!page) continue;
      const view = page.getCropBox();
      const rect = {
        x: view.x + fx * view.width,
        y: view.y + fy * view.height,
        width: fw * view.width,
        height: fh * view.height,
      };
      const { box, rotate } = uprightFrame(rect, page.getRotation().angle);
      await drawSignatureContent(ctx, page, p.content, box, rotate);
    }
  },
});

export const SIGN_MATERIALIZERS = [
  writeSignature,
  writeSignBlock,
  writeInitialPages,
] as const;
