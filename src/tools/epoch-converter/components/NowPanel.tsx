import { Button, Card, Inline } from '@arshad-shah/cynosure';
import { pause, play } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { localZone } from '@/shared/lib/time';
import { nowRows } from '../lib/now';
import { ValueTable } from './ValueTable';

/** The current time, ticking each second (pausable), each unit copyable. */
export const NowPanel: React.FC<{
  now: number;
  onUse: (ms: number) => void;
}> = ({ now: live, onUse }) => {
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const paused = frozenAt !== null;
  const now = frozenAt ?? live;
  return (
    <Card
      as="section"
      title="Now"
      actions={
        <Inline gap="2" wrap>
          <Button size="sm" variant="ghost" onClick={() => onUse(now)}>
            Convert this time
          </Button>
          <Button
            size="sm"
            variant="soft"
            icon={paused ? play : pause}
            onClick={() => setFrozenAt(paused ? null : live)}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </Inline>
      }
    >
      <ValueTable caption="Current time" rows={nowRows(now, localZone())} />
    </Card>
  );
};
