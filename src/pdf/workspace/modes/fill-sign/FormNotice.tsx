import { Notice } from '@arshad-shah/cynosure';
import { Place } from '@/pdf/surfaces/layers';
import type { ModeProps } from '../types';
import { formNotice } from './form-notice';
import { useFillSign } from './store';

/** XFA-only forms and form-reading failures, said on the page (spec §8.1, §13.3). */
export function FormNotice({
  ctx,
  width,
}: {
  ctx: ModeProps;
  /** The page's width on screen. */
  width: number;
}) {
  const base = ctx.doc.state.checkpoints.find(
    (c) => c.id === ctx.doc.view.checkpoint,
  )?.sourceId;
  const info = useFillSign((s) => (base ? s.forms[base] : undefined));
  const formError = useFillSign((s) => s.formError);
  const notice = formNotice(info, formError);
  if (!notice) return null;
  return (
    <Place x={16} y={16} width={Math.max(0, width - 32)}>
      <Notice tone={notice.status} size="sm">
        {notice.message}
      </Notice>
    </Place>
  );
}
