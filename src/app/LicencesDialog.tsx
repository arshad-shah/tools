import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Text,
} from '@/shared/ui';
import { LICENCES } from './licences';

/**
 * Footer entry to the open-source licences of every bundled library and
 * data set (src/app/licences.ts), shown in a dialog.
 */
export function LicencesButton() {
  const [open, setOpen] = useState(false);
  const sorted = [...LICENCES].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-0 font-mono-meta text-xs text-fg-muted hover:bg-transparent hover:text-fg"
        onClick={() => setOpen(true)}
      >
        licences
      </Button>
      <Dialog open={open} onOpenChange={setOpen} size="lg">
        <DialogHeader>
          <DialogTitle>Open-source licences</DialogTitle>
          <DialogDescription>
            Libraries and data bundled with these tools, under their own
            licences.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="grid gap-2">
            {sorted.map((e) => (
              <li key={e.name} className="grid gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {e.name}
                  </a>
                  <Text as="span" size="xs" tone="subtle" mono>
                    {e.licence}
                  </Text>
                </span>
                {e.note ? (
                  <Text as="span" size="xs" tone="muted">
                    {e.note}
                  </Text>
                ) : null}
              </li>
            ))}
          </ul>
        </DialogBody>
      </Dialog>
    </>
  );
}
