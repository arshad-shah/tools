import { Alert, AlertDescription } from '@/shared/ui';
import type { ModeProps } from '../types';
import { formNotice } from './form-notice';
import { useFillSign } from './store';

/** XFA-only forms and form-reading failures, said on the page (spec §8.1, §13.3). */
export function FormNotice({ ctx }: { ctx: ModeProps }) {
  const base = ctx.doc.state.checkpoints.find(
    (c) => c.id === ctx.doc.view.checkpoint,
  )?.sourceId;
  const info = useFillSign((s) => (base ? s.forms[base] : undefined));
  const formError = useFillSign((s) => s.formError);
  const notice = formNotice(info, formError);
  if (!notice) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-4 top-4 flex justify-center">
      <Alert status={notice.status} className="max-w-md">
        <AlertDescription>{notice.message}</AlertDescription>
      </Alert>
    </div>
  );
}
