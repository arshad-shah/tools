import {
  Badge,
  Card,
  DescriptionList,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useState } from 'react';
import { formatIso, localZone } from '@/shared/lib/time';
import { decodeId } from '../lib/decode';

/** Paste any UUID or ULID to see its version, variant and time. */
export const DecodePanel: React.FC = () => {
  const [text, setText] = useState('');
  const d = text.trim() ? decodeId(text) : null;
  const zone = localZone();
  const time = (ms: number) =>
    `${formatIso(ms, zone)} (${zone}), ${formatIso(ms)}`;
  const items =
    !d || d.kind === 'unknown'
      ? []
      : d.kind === 'ulid'
        ? [
            {
              id: 'kind',
              term: 'Kind',
              detail: (
                <Badge tone="success" size="sm">
                  Valid ULID
                </Badge>
              ),
            },
            { id: 'time', term: 'Time', detail: time(d.timestamp) },
          ]
        : [
            {
              id: 'kind',
              term: 'Kind',
              detail: (
                <Badge tone="success" size="sm">
                  {d.special === 'nil'
                    ? 'Nil UUID'
                    : d.special === 'max'
                      ? 'Max UUID'
                      : `UUID version ${d.version}`}
                </Badge>
              ),
            },
            { id: 'variant', term: 'Variant', detail: d.variant },
            ...(d.timestamp !== undefined
              ? [{ id: 'time', term: 'Time', detail: time(d.timestamp) }]
              : []),
          ];
  return (
    <Card as="section" title="Decode an ID">
      <Stack gap="4">
        <TextField
          label="Decode an ID"
          labelHidden
          value={text}
          onChange={setText}
          clearable
          placeholder="Paste a UUID (any format) or a ULID"
          spellCheck={false}
        />
        {d?.kind === 'unknown' ? (
          <Stack>
            <Badge tone="danger">Not a UUID or ULID</Badge>
          </Stack>
        ) : null}
        {items.length ? (
          <DescriptionList size="sm" divided items={items} />
        ) : null}
      </Stack>
    </Card>
  );
};
