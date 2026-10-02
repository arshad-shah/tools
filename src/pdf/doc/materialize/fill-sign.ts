import type { PDFPage } from 'pdf-lib';
import { drawImage, drawText } from '@/pdf/edit/draw';
import { drawCross, drawTick } from '@/pdf/edit/draw-shapes';
import { drawSignatureText, uprightFrame } from '@/pdf/edit/draw-signature';
import { drawStyledText } from '@/pdf/edit/draw-styled-text';
import { unsupportedChars } from '@/pdf/edit/fonts';
import { setFieldValue } from '@/pdf/edit/forms';
import type {
  FlatFillParams,
  FormSetValueParams,
  SignPlaceParams,
} from '../ops/fill-sign';
import {
  defineMaterializer,
  type MaterializeCtx,
  type Materializer,
} from './registry';

const INK = '#000000';
/** Default flat-fill text size: fits a typical 20-22pt form row. */
const TEXT_SIZE = 11;

const pageNumber = (ctx: MaterializeCtx, page: PDFPage) =>
  ctx.doc.getPages().indexOf(page) + 1;

export const writeFormValue = defineMaterializer<FormSetValueParams>({
  type: 'form.setValue',
  phase: 'form',
  async apply(ctx, p) {
    const form = ctx.doc.getForm();
    const font = await ctx.draw.fonts.get({ standard: 'Helvetica' });
    setFieldValue(form, p.name, p.value, font);
    const field = form.getField(p.name);
    if (field.needsAppearancesUpdate()) field.defaultUpdateAppearances(font);
  },
});

export const writeFlatFill = defineMaterializer<FlatFillParams>({
  type: 'flat.fill',
  phase: 'flat',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page || p.value === '') return;
    const { box, rotate } = uprightFrame(p.rect, page.getRotation().angle);
    if (p.kind === 'tick') return drawTick(page, p.rect, INK);
    if (p.kind === 'cross') return drawCross(page, p.rect, INK);
    // Helvetica for WinAnsi text; the Unicode font for anything else.
    const helvetica = await ctx.draw.fonts.get({ standard: 'Helvetica' });
    const winAnsi = unsupportedChars(helvetica, p.value.replace(/\n/g, ''));
    const size = p.size ?? Math.min(TEXT_SIZE, box.height * 0.75);
    const font = winAnsi.length
      ? ({ unicode: true } as const)
      : ({ standard: 'Helvetica' } as const);
    if (!p.multiline && (p.color || p.spacing || p.comb)) {
      const laid = await drawStyledText(ctx.draw, page, p.value, box, {
        font,
        size,
        color: p.color ?? INK,
        spacing: p.spacing,
        comb: p.comb,
        rotate,
      });
      if (laid.truncated)
        ctx.note(
          `Text in a field on page ${pageNumber(ctx, page)} was too long and was cut`,
        );
      return;
    }
    const fitted = await drawText(ctx.draw, page, p.value, box, {
      font,
      size,
      color: p.color ?? INK,
      fit: 'shrink',
      minSize: 6,
      multiline: p.multiline ?? false,
      rotate,
    });
    if (fitted.truncated)
      ctx.note(
        `Text in a field on page ${pageNumber(ctx, page)} was too long and was cut`,
      );
  },
});

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
    const c = p.content;
    if (c.kind === 'image')
      return drawImage(ctx.draw, page, ctx.asset(c.assetId), c.mime, box, {
        rotate,
      });
    await drawSignatureText(
      ctx.draw,
      page,
      {
        text: c.text,
        fontKey: c.fontId,
        fontBytes: ctx.asset(c.fontAsset),
        color: c.color,
      },
      box,
      rotate,
    );
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FILL_SIGN_MATERIALIZERS: readonly Materializer<any>[] = [
  writeFormValue,
  writeFlatFill,
  writeSignature,
];
