import {
  Accordion,
  AccordionItem,
  Badge,
  Card,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { Operation, TagGroup } from '../lib/api';
import type { BuiltRequest } from '../lib/request';
import { methodTone } from '../lib/tones';
import { OperationDetail } from './OperationDetail';

function Summary({ op }: { op: Operation }) {
  return (
    <Inline gap="2" align="center" wrap>
      <Badge size="sm" variant="solid" tone={methodTone(op.method)}>
        {op.method}
      </Badge>
      <Text size="sm" variant="code" wrap="break">
        {op.path}
      </Text>
      {op.summary ? (
        <Text size="sm" tone="muted">
          {op.summary}
        </Text>
      ) : null}
      {op.deprecated ? (
        <Badge size="sm" tone="neutral">
          deprecated
        </Badge>
      ) : null}
    </Inline>
  );
}

interface Props {
  doc: unknown;
  groups: TagGroup[];
  requestFor(op: Operation): BuiltRequest;
  onSend(op: Operation): void;
}

/** Operations by tag; an operation's details render only while it is open. */
export function OperationList({ doc, groups, requestFor, onSend }: Props) {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <Stack gap="5">
      {groups.map((g) => (
        <Card
          key={g.name}
          as="section"
          title={g.name}
          description={g.description}
          actions={
            <Badge size="sm" tone="neutral">
              {`${g.operations.length} ${g.operations.length === 1 ? 'operation' : 'operations'}`}
            </Badge>
          }
        >
          <Accordion
            type="multiple"
            value={open}
            onValueChange={setOpen}
            regions={g.operations.length <= 6}
          >
            {g.operations.map((op) => (
              <AccordionItem
                key={op.id}
                value={op.id}
                summary={<Summary op={op} />}
              >
                {open.includes(op.id) ? (
                  <OperationDetail
                    doc={doc}
                    op={op}
                    request={requestFor(op)}
                    onSend={() => onSend(op)}
                  />
                ) : null}
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      ))}
    </Stack>
  );
}
