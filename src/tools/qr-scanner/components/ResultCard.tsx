import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveBlob } from '@/shared/lib/download';
import { sendTo } from '@/shared/lib/handoff';
import { FORMAT_LABELS, type DecodedBarcode } from '@/shared/lib/qr-decode';
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  CopyButton,
  DescriptionList,
  Dialog,
  Inline,
  Menu,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import {
  calendar,
  chevronDown,
  external,
  link as linkIcon,
  qrCode,
  type as typeIcon,
  user,
  type IconData,
} from '@arshad-shah/cynosure/icons';
import { resultHandoffs, type ResultTarget } from '../lib/handoffs';
import { icsFor, interpret, KIND_LABELS, vcfFor } from '../lib/interpret';

const TARGET_LABELS: Record<ResultTarget, { label: string; icon: IconData }> = {
  'url-parser': { label: 'URL Inspector', icon: linkIcon },
  'qr-code-generator': { label: 'QR Code Generator', icon: qrCode },
  'url-encoder-decoder': { label: 'Text Encoder', icon: typeIcon },
};

/** One decoded code: what it is, its fields and the actions that fit. */
export function ResultCard({
  result,
  index,
}: {
  result: DecodedBarcode;
  index: number;
}) {
  const navigate = useNavigate();
  const info = interpret(result.text);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const link =
    info.fields.find(([l]) => l === 'URL')?.[1] ?? result.text.trim();
  const handoffs = resultHandoffs(result);
  const targets = (Object.keys(TARGET_LABELS) as ResultTarget[]).filter(
    (t) => handoffs[t],
  );
  const send = (target: ResultTarget) => {
    const payload = handoffs[target];
    if (payload) sendTo(navigate, target, payload);
  };

  return (
    <Card
      as="section"
      title={KIND_LABELS[info.kind]}
      headingLevel={3}
      actions={
        <Inline gap="2">
          <Badge tone="neutral">{FORMAT_LABELS[result.format]}</Badge>
          <Badge tone="neutral" variant="outline">{`Code ${index + 1}`}</Badge>
        </Inline>
      }
    >
      <Stack gap="5">
        <DescriptionList
          layout="auto"
          divided
          items={info.fields.map(([label, value], i) => ({
            id: `${label}-${i}`,
            term: label,
            detail:
              info.secret !== undefined && label === 'Password' ? (
                <TextField
                  label="WiFi password"
                  labelHidden
                  type="password"
                  revealable
                  readOnly
                  size="sm"
                  value={value}
                  addonEnd={
                    <CopyButton
                      size="sm"
                      variant="ghost"
                      value={value}
                      labels={{ copy: 'Copy password' }}
                    />
                  }
                />
              ) : (
                <Text wrap="break">{value}</Text>
              ),
          }))}
        />
        {info.kind !== 'text' &&
        info.kind !== 'url' &&
        info.secret === undefined ? (
          <CodeBlock title="Raw text" code={result.text} wrap copyable />
        ) : null}
        <Inline gap="2" wrap>
          <CopyButton
            size="sm"
            variant="soft"
            value={result.text}
            labels={{ copy: 'Copy text' }}
          />
          {info.actions.includes('open') ? (
            <Button
              size="sm"
              variant="solid"
              icon={external}
              onClick={() => setConfirmOpen(true)}
            >
              Open link
            </Button>
          ) : null}
          {/* The hand-offs share one menu: up to three tools fit a code. */}
          {targets.length ? (
            <Menu
              label="Open in"
              items={targets.map((t) => ({
                value: t,
                label: TARGET_LABELS[t].label,
                icon: TARGET_LABELS[t].icon,
              }))}
              onSelect={(t) => send(t as ResultTarget)}
              trigger={(props) => (
                <Button
                  {...props}
                  size="sm"
                  variant="soft"
                  icon={external}
                  iconEnd={chevronDown}
                >
                  Open in
                </Button>
              )}
            />
          ) : null}
          {info.actions.includes('vcf') ? (
            <Button
              size="sm"
              variant="soft"
              icon={user}
              onClick={() =>
                saveBlob(
                  new Blob([vcfFor(result.text)], { type: 'text/vcard' }),
                  'contact.vcf',
                )
              }
            >
              Add to contacts
            </Button>
          ) : null}
          {info.actions.includes('ics') ? (
            <Button
              size="sm"
              variant="soft"
              icon={calendar}
              onClick={() =>
                saveBlob(
                  new Blob([icsFor(result.text)], { type: 'text/calendar' }),
                  'event.ics',
                )
              }
            >
              Save event
            </Button>
          ) : null}
        </Inline>
      </Stack>
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Open this link?"
        description="Check the full address before you open it."
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              icon={external}
              onClick={() => {
                setConfirmOpen(false);
                window.open(link, '_blank', 'noopener,noreferrer');
              }}
            >
              Open
            </Button>
          </>
        }
      >
        <CodeBlock code={link} wrap />
      </Dialog>
    </Card>
  );
}
