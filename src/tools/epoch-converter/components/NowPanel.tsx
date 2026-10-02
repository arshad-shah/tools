import React, { useState } from 'react';
import { IconPause, IconPlay } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  CopyButton,
  Inline,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/shared/ui';
import { localZone } from '@/shared/lib/time';
import { nowRows } from '../lib/now';

/** The current time, ticking each second (pausable), each unit copyable. */
export const NowPanel: React.FC<{
  now: number;
  onUse: (ms: number) => void;
}> = ({ now: live, onUse }) => {
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const paused = frozenAt !== null;
  const now = frozenAt ?? live;
  const zone = localZone();

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" gap="2" wrap>
          <CardTitle as="h2">Now</CardTitle>
          <Inline gap="2">
            <Button variant="secondary" size="sm" onClick={() => onUse(now)}>
              Convert this time
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                paused ? <IconPlay size="sm" /> : <IconPause size="sm" />
              }
              onClick={() => setFrozenAt(paused ? null : live)}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <div data-dynamic="">
          <Table aria-label="Current time">
            <TableBody>
              {nowRows(now, zone).map((r) => (
                <TableRow key={r.label}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>
                    <Code>{r.value}</Code>
                  </TableCell>
                  <TableCell>
                    <CopyButton label={r.label} value={r.value} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};
