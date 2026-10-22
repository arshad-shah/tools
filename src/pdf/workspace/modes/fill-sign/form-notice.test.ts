import { describe, expect, it } from 'vitest';
import type { FormInfo, WidgetInfo } from '@/pdf/render/form-info';
import { formNotice } from './form-notice';

const widget = { fieldName: 'f1', kind: 'text' } as WidgetInfo;
const info = (o: Partial<FormInfo>): FormInfo => ({
  hasAcroForm: false,
  hasXfa: false,
  widgets: [],
  ...o,
});

describe('formNotice', () => {
  it('says nothing for a hybrid form: its AcroForm fields fill normally', () => {
    // IRS forms carry XFA alongside a full AcroForm.
    expect(
      formNotice(
        info({ hasAcroForm: true, hasXfa: true, widgets: [widget] }),
        null,
      ),
    ).toBeNull();
  });

  it('warns on an XFA-only form, which has no fields to fill', () => {
    expect(formNotice(info({ hasXfa: true }), null)).toMatchObject({
      status: 'warning',
      message: expect.stringMatching(/XFA/),
    });
  });

  it('reports a form-reading failure', () => {
    expect(formNotice(undefined, new Error('Bad form'))).toEqual({
      status: 'danger',
      message: 'Bad form',
    });
  });

  it('says nothing for an ordinary form or a plain PDF', () => {
    expect(
      formNotice(info({ hasAcroForm: true, widgets: [widget] }), null),
    ).toBeNull();
    expect(formNotice(undefined, null)).toBeNull();
  });
});
