import {
  IconFieldCross,
  IconFieldDate,
  IconFieldSignature,
  IconFieldSuggested,
  IconFieldText,
  IconFieldTick,
  IconFlatFormDetect,
  IconFlatten,
  IconInitials,
  IconMakeFillable,
  IconMyDetails,
  IconNextField,
} from '@/shared/ui/icons';
import { StatusDot, Text, type ToolGroup } from '@/shared/ui';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import {
  addFieldAtCentre,
  addTextAtCentre,
  advance,
  flatten,
  makeFillable,
} from './actions';
import { AutofillPreview } from './AutofillPreview';
import { useDetection, useFormInfo, useViewFields } from './data';
import { MyDetailsDialog } from './MyDetailsDialog';
import { SignatureDialog } from './SignatureDialog';
import { autofillOp, openMyDetails } from './my-details-flow';
import { fillSign, useFillSign } from './store';

/** Fill & Sign tools (plan C-12): fields, fill, sign, form. */
export function FillSignToolbar(ctx: ModeProps) {
  const { doc, tool } = ctx;
  useFormInfo(doc);
  useDetection(doc, true);
  const fields = useViewFields(doc);
  const showDetected = useFillSign((s) => s.showDetected);
  const dialog = useFillSign((s) => s.dialog);
  const progress = useFillSign((s) => s.progress);
  const rows = useFillSign((s) => s.autofillRows);
  const accepted = fields.filter(
    (f) => f.origin === 'detected' && f.status === 'field',
  ).length;
  const hasWidgets = fields.some((f) => f.origin === 'widget');

  const toggleTool = (id: string) => tool.set(tool.id === id ? null : id);
  const sign = (role: 'signature' | 'initials') =>
    fillSign.set({ panelRole: role, dialog: 'signature', signTarget: null });

  const groups: ToolGroup[] = [
    {
      id: 'fields',
      label: 'Fields',
      items: [
        {
          id: 'detect',
          label: 'Detect fields',
          icon: IconFlatFormDetect,
          kind: 'toggle',
          pressed: showDetected,
          onSelect: () => fillSign.set({ showDetected: !showDetected }),
        },
        {
          id: 'next-field',
          label: 'Next empty field',
          icon: IconNextField,
          shortcut: 'Tab',
          kind: 'button',
          onSelect: () => advance(ctx, fields, fillSign.get().focusKey),
        },
        {
          id: 'add-field',
          label: 'Add field',
          icon: IconFieldSuggested,
          kind: 'split',
          pressed: tool.id === 'add-field',
          onSelect: () => toggleTool('add-field'),
          menu: [
            {
              id: 'add-field-centre',
              label: 'Add at page centre',
              onSelect: () => addFieldAtCentre(ctx),
            },
          ],
        },
      ],
    },
    {
      id: 'fill',
      label: 'Fill',
      items: [
        {
          id: 'text',
          label: 'Text',
          icon: IconFieldText,
          shortcut: 'T',
          kind: 'split',
          pressed: tool.id === 'text',
          onSelect: () => toggleTool('text'),
          menu: [
            {
              id: 'text-centre',
              label: 'Add text box at page centre',
              onSelect: () => addTextAtCentre(ctx),
            },
          ],
        },
        {
          id: 'tick',
          label: 'Tick',
          icon: IconFieldTick,
          kind: 'toggle',
          pressed: tool.id === 'tick',
          onSelect: () => toggleTool('tick'),
        },
        {
          id: 'cross',
          label: 'Cross',
          icon: IconFieldCross,
          kind: 'toggle',
          pressed: tool.id === 'cross',
          onSelect: () => toggleTool('cross'),
        },
        {
          id: 'date',
          label: 'Date',
          icon: IconFieldDate,
          kind: 'toggle',
          pressed: tool.id === 'date',
          onSelect: () => toggleTool('date'),
        },
      ],
    },
    {
      id: 'sign',
      label: 'Sign',
      items: [
        {
          id: 'signature',
          label: 'Signature',
          icon: IconFieldSignature,
          kind: 'button',
          onSelect: () => sign('signature'),
        },
        {
          id: 'initials',
          label: 'Initials',
          icon: IconInitials,
          kind: 'button',
          onSelect: () => sign('initials'),
        },
      ],
    },
    {
      id: 'form',
      label: 'Form',
      items: [
        {
          id: 'my-details',
          label: 'My details',
          icon: IconMyDetails,
          kind: 'button',
          onSelect: () => void openMyDetails(fields),
        },
        {
          id: 'make-fillable',
          label: 'Make fillable',
          icon: IconMakeFillable,
          kind: 'button',
          disabled: accepted === 0 ? 'No accepted detected fields' : false,
          onSelect: () => void makeFillable(ctx, fields),
        },
        {
          id: 'flatten',
          label: 'Flatten',
          icon: IconFlatten,
          kind: 'button',
          disabled: hasWidgets ? false : 'This document has no form fields',
          onSelect: () => void flatten(ctx),
        },
      ],
    },
  ];

  return (
    <>
      <ModeToolbar
        groups={groups}
        trailing={
          progress ? (
            <Text
              as="span"
              size="xs"
              tone="muted"
              className="flex items-center gap-2 px-2"
            >
              <StatusDot tone="info" pulse decorative />
              {`Detecting fields, page ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`}
            </Text>
          ) : null
        }
      />
      <SignatureDialog ctx={ctx} />
      <MyDetailsDialog
        open={dialog === 'details'}
        onOpenChange={(o) => fillSign.set({ dialog: o ? 'details' : null })}
      />
      <AutofillPreview
        open={dialog === 'autofill'}
        onOpenChange={(o) => fillSign.set({ dialog: o ? 'autofill' : null })}
        rows={rows}
        toOp={(r) => autofillOp(fields, r)}
        dispatch={(ops, label) => doc.dispatch(ops, label)}
        onEditDetails={() => fillSign.set({ dialog: 'details' })}
      />
    </>
  );
}
