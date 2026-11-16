import {
  Dialog,
  Heading,
  Inline,
  Popover,
  Sheet,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import type { ReactNode, RefObject } from 'react';

/** Where a tool's options show: beside its button, as a phone sheet, or centred. */
export interface ToolSurface {
  presentation: 'popover' | 'sheet' | 'dialog';
  anchor?: RefObject<HTMLElement | null>;
}

export interface ToolDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: ReactNode;
  /** The buttons at the end (Cancel, the action). */
  actions?: ReactNode;
  surface?: ToolSurface;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const anchors = new WeakMap<object, { getBoundingClientRect(): DOMRect }>();
/** A virtual anchor that measures the element when the popover places. */
function anchorOf(ref: RefObject<HTMLElement | null>) {
  let a = anchors.get(ref);
  if (!a) {
    a = {
      getBoundingClientRect: () =>
        ref.current?.getBoundingClientRect() ?? new DOMRect(),
    };
    anchors.set(ref, a);
  }
  return a;
}

/**
 * A tool's options: a Popover beside the button that opened it on
 * desktop, a bottom Sheet on phones, a Dialog otherwise. The same title,
 * description, fields and actions in each.
 */
export function ToolDialog({
  open,
  onOpenChange,
  title,
  description,
  actions,
  surface,
  size = 'md',
  children,
}: ToolDialogProps) {
  const anchor = surface?.anchor ? anchorOf(surface.anchor) : undefined;
  const how = surface?.presentation ?? 'dialog';
  if (how === 'sheet')
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        side="bottom"
        title={title}
        description={description}
        actions={actions}
      >
        {children}
      </Sheet>
    );
  if (how === 'popover' && anchor)
    return (
      <Popover
        label={title}
        anchor={anchor}
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom"
        size={size}
      >
        <Stack gap="4">
          <Stack gap="1">
            <Heading level={2} size="sm">
              {title}
            </Heading>
            {description ? (
              <Text as="p" size="sm" tone="muted">
                {description}
              </Text>
            ) : null}
          </Stack>
          {children}
          {actions ? (
            <Inline gap="2" justify="end">
              {actions}
            </Inline>
          ) : null}
        </Stack>
      </Popover>
    );
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      actions={actions}
      size={size}
    >
      {children}
    </Dialog>
  );
}
