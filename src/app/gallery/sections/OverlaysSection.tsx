import { useRef, useState } from 'react';
import {
  Button,
  CommandPalette,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  Stack,
  Swatch,
  Text,
} from '@/shared/ui';
import { notify } from '@/shared/lib/notify';
import { IconChevronDown } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

/**
 * The Popover starts open so its surface is part of the baseline; the other
 * overlays open on demand (dialogs cover the page and are not screenshotted).
 */
export function OverlaysSection() {
  const anchor = useRef<HTMLButtonElement>(null);
  const noteAnchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState(false);
  const [palette, setPalette] = useState(false);
  return (
    <Section name="overlays" title="Overlays">
      <div className="min-h-56">
        <Row label="Popover (open)">
          <Button
            ref={anchor}
            onClick={() => setOpen((o) => !o)}
            rightIcon={<IconChevronDown size="sm" />}
          >
            Colour
          </Button>
          <Popover
            open={open}
            onOpenChange={setOpen}
            anchor={anchor}
            label="Colour"
            initialFocus={anchor}
          >
            <Stack gap="2">
              <Text size="sm" weight="semibold">
                Highlight colour
              </Text>
              <div className="flex gap-2">
                <Swatch color="accent" label="Mint" />
                <Swatch color="warning" label="Amber" selected />
                <Swatch color="info" label="Blue" />
                <Swatch color="danger" label="Red" />
              </div>
            </Stack>
          </Popover>
          <Button ref={noteAnchor} onClick={() => setNote((o) => !o)}>
            Add note
          </Button>
          <Popover
            open={note}
            onOpenChange={setNote}
            anchor={noteAnchor}
            label="Note"
          >
            <Stack gap="2">
              <Text size="sm">Notes stay on this device.</Text>
              <Button size="sm" onClick={() => setNote(false)}>
                Done
              </Button>
            </Stack>
          </Popover>
        </Row>
      </div>
      <Row label="Menu, palette, toasts">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button rightIcon={<IconChevronDown size="sm" />}>Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => {}}>Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => {}}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => setPalette(true)}>Command palette</Button>
        <CommandPalette open={palette} onOpenChange={setPalette} />
        <Button onClick={() => notify.success('Saved 3 files')}>
          Success toast
        </Button>
        <Button
          onClick={() =>
            notify.info('Page deleted', {
              action: { label: 'Undo', onClick: () => {} },
            })
          }
        >
          Toast with action
        </Button>
        <Button onClick={() => notify.error('That file is not a PDF')}>
          Error toast
        </Button>
      </Row>
    </Section>
  );
}
