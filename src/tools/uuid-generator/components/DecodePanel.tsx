import React, { useState } from 'react';
import { Badge, Inline, Input, Label, Stack, Text } from '@/shared/ui';
import { formatIso, localZone } from '@/shared/lib/time';
import { decodeId } from '../lib/decode';

/** Paste any UUID or ULID to see its version, variant and time. */
export const DecodePanel: React.FC = () => {
  const [text, setText] = useState('');
  const d = text.trim() ? decodeId(text) : null;
  const zone = localZone();
  const time = (ms: number) =>
    `${formatIso(ms, zone)} (${zone}), ${formatIso(ms)}`;
  return (
    <Stack gap="2">
      <Label htmlFor="uuid-decode">Decode an ID</Label>
      <Input
        id="uuid-decode"
        value={text}
        onChange={setText}
        placeholder="Paste a UUID (any format) or a ULID"
        spellCheck={false}
      />
      {d && (
        <Stack gap="1" role="status">
          {d.kind === 'unknown' ? (
            <Badge variant="soft" tone="danger" size="sm">
              Not a UUID or ULID
            </Badge>
          ) : d.kind === 'ulid' ? (
            <>
              <Inline gap="2">
                <Badge variant="soft" tone="success" size="sm">
                  Valid ULID
                </Badge>
              </Inline>
              <Text size="sm">Time: {time(d.timestamp)}</Text>
            </>
          ) : (
            <>
              <Inline gap="2" wrap>
                <Badge variant="soft" tone="success" size="sm">
                  {d.special === 'nil'
                    ? 'Nil UUID'
                    : d.special === 'max'
                      ? 'Max UUID'
                      : `UUID version ${d.version}`}
                </Badge>
                <Badge variant="soft" tone="neutral" size="sm">
                  Variant: {d.variant}
                </Badge>
              </Inline>
              {d.timestamp !== undefined && (
                <Text size="sm">Time: {time(d.timestamp)}</Text>
              )}
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
};
