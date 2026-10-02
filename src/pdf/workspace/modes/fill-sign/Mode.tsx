import type { Command } from '@/shared/lib/commands';
import { FILL_SIGN_OPS } from '@/pdf/doc/ops/fill-sign';
import type { ModeContext, ModeModule } from '../types';
import {
  addFieldAtCentre,
  addTextAtCentre,
  advance,
  flatten,
  makeFillable,
} from './actions';
import { currentFields, redetect } from './data';
import { FieldsOverlay } from './FieldsOverlay';
import { FillSignInspector } from './FillSignInspector';
import { FillSignToolbar } from './FillSignToolbar';
import { openMyDetails } from './my-details-flow';
import { FillSignRailBadge } from './RailBadge';
import { nextPlaceToSign } from './sign-places';
import { fillSign } from './store';
import { clearTrustedRootsCommand } from './trusted-roots-command';

const GROUP = 'Fill & Sign';

function removeSelected(ctx: ModeContext): void {
  const ids = [...ctx.selection.objects];
  if (!ids.length) return;
  const ops = ctx.doc.dispatch(
    ids.map((targetId) => ({ type: 'object.remove', params: { targetId } })),
  );
  if (ops.length) ctx.selection.clear();
}

function commands(ctx: ModeContext): Command[] {
  return [
    clearTrustedRootsCommand(),
    {
      id: 'fill-sign-next',
      label: 'Next empty field',
      group: GROUP,
      run: () => {
        advance(ctx, currentFields(ctx.doc), fillSign.get().focusKey);
      },
    },
    {
      id: 'fill-sign-next-sign-target',
      label: 'Next place to sign',
      group: GROUP,
      keywords: ['signature', 'smart placement'],
      run: () => void nextPlaceToSign(ctx),
    },
    {
      id: 'fill-sign-my-details',
      label: 'Fill from My details',
      group: GROUP,
      keywords: ['autofill', 'profile'],
      run: () => void openMyDetails(currentFields(ctx.doc)),
    },
    {
      id: 'fill-sign-add-text',
      label: 'Add text box at page centre',
      group: GROUP,
      keywords: ['type', 'write'],
      run: () => addTextAtCentre(ctx),
    },
    {
      id: 'fill-sign-add-field',
      label: 'Add field at page centre',
      group: GROUP,
      run: () => addFieldAtCentre(ctx),
    },
    {
      id: 'fill-sign-make-fillable',
      label: 'Make form fillable',
      group: GROUP,
      run: () => void makeFillable(ctx, currentFields(ctx.doc)),
    },
    {
      id: 'fill-sign-flatten',
      label: 'Flatten form',
      group: GROUP,
      run: () => void flatten(ctx),
    },
    {
      id: 'fill-sign-detect-page',
      label: 'Detect fields on this page',
      group: GROUP,
      run: () => {
        if (ctx.doc.currentPage) redetect(ctx.doc, ctx.doc.currentPage);
      },
    },
  ];
}

const mode: ModeModule = {
  operations: [...FILL_SIGN_OPS],
  Toolbar: FillSignToolbar,
  Inspector: FillSignInspector,
  PageOverlay: FieldsOverlay,
  RailBadge: FillSignRailBadge,
  commands,
  shortcuts: (ctx) => [
    {
      id: 'fill-sign-text',
      combo: 'T',
      description: 'Text tool',
      group: GROUP,
      run: () => ctx.tool.set(ctx.tool.id === 'text' ? null : 'text'),
    },
    {
      id: 'fill-sign-delete',
      combo: 'Delete',
      description: 'Remove the selected signature',
      group: GROUP,
      run: () => removeSelected(ctx),
    },
  ],
  onEnter: () => fillSign.reset(),
  onLeave: (ctx) => {
    ctx.tool.set(null);
    fillSign.reset();
  },
};

export default mode;
