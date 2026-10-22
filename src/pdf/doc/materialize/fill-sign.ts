import {
  PDFBool,
  PDFHexString,
  PDFName,
  PDFTextField,
  type PDFPage,
} from 'pdf-lib';
import { drawText } from '@/pdf/edit/draw';
import { drawCross, drawTick } from '@/pdf/edit/draw-shapes';
import { uprightFrame } from '@/pdf/edit/draw-signature';
import { drawStyledText } from '@/pdf/edit/draw-styled-text';
import { unsupportedChars } from '@/pdf/edit/fonts';
import { autoTextSize, setFieldValue } from '@/pdf/edit/forms';
import type { FlatFillParams, FormSetValueParams } from '../ops/fill-sign';
import { SIGN_MATERIALIZERS } from './fill-sign-signature';
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
    const helvetica = await ctx.draw.fonts.get({ standard: 'Helvetica' });
    let value = p.value;
    let font = helvetica;
    const target = form.getFieldMaybe(p.name);
    if (target instanceof PDFTextField && typeof value === 'string') {
      // One field must not fail the whole export: text past the field's
      // limit is cut (the editor stops typing there too), and text
      // Helvetica can't draw takes a Unicode font that draws all of it.
      const max = target.getMaxLength();
      if (max !== undefined) value = Array.from(value).slice(0, max).join('');
      const text = value.replace(/[\r\n]/g, '');
      if (unsupportedChars(helvetica, text).length) {
        const stack = await ctx.draw.fonts.forText({ unicode: true }, text);
        const one = stack.fonts.find((f) => !unsupportedChars(f, text).length);
        if (!one) {
          // Mixed scripts no one font has: keep the value and let the
          // viewer draw it with its own fonts.
          target.acroField.setValue(PDFHexString.fromText(value));
          for (const w of target.acroField.getWidgets())
            w.dict.delete(PDFName.of('AP'));
          form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);
          return;
        }
        font = one;
      }
    }
    setFieldValue(form, p.name, value, font);
    const field = form.getField(p.name);
    // An auto-size (0) field: the size the editor previewed, not pdf-lib's
    // box-filling auto size (a 25pt row came out at 19pt).
    if (field instanceof PDFTextField && !field.isReadOnly()) {
      const da = field.acroField.getDefaultAppearance() ?? '';
      const size = Number(/([\d.]+)\s+Tf/.exec(da)?.[1] ?? 0);
      const rect = field.acroField.getWidgets()[0]?.getRectangle();
      if (size === 0 && rect) field.setFontSize(autoTextSize(rect.height));
    }
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
    // Styled layout for multiline text too: the overlay previews that
    // layout, so wrapping, size and line spacing match the page.
    if (p.spacing || p.comb || p.multiline || p.color) {
      const laid = await drawStyledText(ctx.draw, page, p.value, box, {
        font,
        size,
        color: p.color ?? INK,
        spacing: p.spacing,
        comb: p.comb,
        cells: p.cells,
        rotate,
        multiline: p.multiline ?? false,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FILL_SIGN_MATERIALIZERS: readonly Materializer<any>[] = [
  writeFormValue,
  writeFlatFill,
  ...SIGN_MATERIALIZERS,
];
