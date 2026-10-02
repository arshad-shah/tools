/** One AcroForm widget as pdf.js reads it; rect in page space (PDF points). */
export interface WidgetInfo {
  fieldName: string;
  kind:
    | 'text'
    | 'checkbox'
    | 'radio'
    | 'dropdown'
    | 'optionlist'
    /** A /Sig field (pdf.js does not say whether it is signed). */
    | 'signature'
    | 'unsupported';
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  readOnly: boolean;
  /** Checkbox or radio option on-state. */
  onValue?: string;
  /** Text, checked state, selected option(s). */
  value: string | boolean | string[];
  /** The field's user-facing name (/TU), if any. */
  label: string | null;
  options?: string[];
  multiline?: boolean;
  multiSelect?: boolean;
  maxLength?: number | null;
}

export interface FormInfo {
  hasAcroForm: boolean;
  hasXfa: boolean;
  widgets: WidgetInfo[];
}

interface Annotation {
  subtype: string;
  fieldType?: string;
  fieldName?: string;
  rect: number[];
  readOnly?: boolean;
  checkBox?: boolean;
  radioButton?: boolean;
  combo?: boolean;
  multiLine?: boolean;
  multiSelect?: boolean;
  maxLen?: number;
  exportValue?: string;
  buttonValue?: string;
  fieldValue?: unknown;
  alternativeText?: string;
  options?: { exportValue: string; displayValue: string }[];
}

function kindOf(a: Annotation): WidgetInfo['kind'] {
  if (a.fieldType === 'Tx') return 'text';
  if (a.fieldType === 'Btn' && a.checkBox) return 'checkbox';
  if (a.fieldType === 'Btn' && a.radioButton) return 'radio';
  if (a.fieldType === 'Ch') return a.combo ? 'dropdown' : 'optionlist';
  if (a.fieldType === 'Sig') return 'signature';
  return 'unsupported';
}

function valueOf(a: Annotation, kind: WidgetInfo['kind']): WidgetInfo['value'] {
  const v = a.fieldValue;
  if (kind === 'checkbox') return !!v && v !== 'Off' && v === a.exportValue;
  if (kind === 'radio') return typeof v === 'string' && v !== 'Off' ? v : '';
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  return typeof v === 'string' ? v : '';
}

/** The parts of a pdf.js document this module reads (tests pass the legacy build's). */
export interface FormDocLike {
  numPages: number;
  getMetadata(): Promise<{ info: unknown }>;
  getPage(n: number): Promise<{ getAnnotations(): Promise<unknown[]> }>;
}

/** Widgets of every page, plus the document's AcroForm and XFA flags. */
export async function readFormInfo(doc: FormDocLike): Promise<FormInfo> {
  const meta = await doc.getMetadata();
  const info = meta.info as {
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
  };
  const widgets: WidgetInfo[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const annots = (await page.getAnnotations()) as Annotation[];
    for (const a of annots) {
      if (a.subtype !== 'Widget' || !a.fieldName) continue;
      const kind = kindOf(a);
      const [x1, y1, x2, y2] = a.rect;
      widgets.push({
        fieldName: a.fieldName,
        kind,
        pageIndex: i,
        rect: {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        },
        readOnly: !!a.readOnly,
        value: valueOf(a, kind),
        label: a.alternativeText?.trim() || null,
        ...(kind === 'checkbox' && a.exportValue
          ? { onValue: a.exportValue }
          : {}),
        ...(kind === 'radio' && a.buttonValue
          ? { onValue: a.buttonValue }
          : {}),
        ...(a.options ? { options: a.options.map((o) => o.exportValue) } : {}),
        ...(kind === 'text'
          ? { multiline: !!a.multiLine, maxLength: a.maxLen ?? null }
          : {}),
        ...(kind === 'optionlist' || kind === 'dropdown'
          ? { multiSelect: !!a.multiSelect }
          : {}),
      });
    }
  }
  return {
    hasAcroForm: !!info.IsAcroFormPresent || widgets.length > 0,
    hasXfa: !!info.IsXFAPresent,
    widgets,
  };
}
