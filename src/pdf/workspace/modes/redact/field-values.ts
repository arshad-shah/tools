import type { PageRef } from '@/pdf/doc/types';
import type { FormInfo } from '@/pdf/render/form-info';
import type { SearchField } from '@/pdf/redact/search';
import type { DocumentApi } from '../types';

/** One formInfo read per open file while a search runs. */
export type FormInfoCache = Map<string, Promise<FormInfo | null>>;

/**
 * The text values of a page's form fields, for the redaction search. A file
 * whose form cannot be read gives no field matches; verification still
 * refuses an apply that leaves a searched term in a field.
 */
export async function pageFieldValues(
  doc: Pick<DocumentApi, 'sources' | 'render'>,
  page: PageRef,
  cache: FormInfoCache,
): Promise<SearchField[]> {
  const docId = doc.sources?.[page.source]?.docId;
  if (!docId) return [];
  let info = cache.get(docId);
  if (!info) {
    info = doc.render.formInfo(docId).catch(() => null);
    cache.set(docId, info);
  }
  const form = await info;
  if (!form) return [];
  return form.widgets.flatMap((w) => {
    if (w.pageIndex !== page.index || typeof w.value === 'boolean') return [];
    const value = Array.isArray(w.value) ? w.value.join(' ') : w.value;
    return value ? [{ name: w.label ?? w.fieldName, value, rect: w.rect }] : [];
  });
}
