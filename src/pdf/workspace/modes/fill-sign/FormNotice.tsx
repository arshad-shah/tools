import { Alert, AlertDescription } from '@/shared/ui';
import { XFA_MESSAGE } from '@/pdf/edit/messages';
import type { ModeProps } from '../types';
import { useFillSign } from './store';

/** XFA forms and form-reading failures, said on the page (spec §8.1, §13.3). */
export function FormNotice({ ctx }: { ctx: ModeProps }) {
  const base = ctx.doc.state.checkpoints.find(
    (c) => c.id === ctx.doc.view.checkpoint,
  )?.sourceId;
  const info = useFillSign((s) => (base ? s.forms[base] : undefined));
  const formError = useFillSign((s) => s.formError);
  if (!info?.hasXfa && !formError) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-4 top-4 flex justify-center">
      <Alert status={info?.hasXfa ? 'warning' : 'danger'} className="max-w-md">
        <AlertDescription>
          {info?.hasXfa
            ? `${XFA_MESSAGE} You can still type, tick and sign anywhere on the page.`
            : formError?.message}
        </AlertDescription>
      </Alert>
    </div>
  );
}
