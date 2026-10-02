import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { sendTo } from '@/shared/lib/handoff';
import { FORMAT_LABELS, type DecodedBarcode } from '@/shared/lib/qr-decode';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Inline,
  SecretText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/shared/ui';
import {
  IconCalendar,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconQrCode,
  IconType,
  IconUser,
} from '@/shared/ui/icons';
import { resultHandoffs, type ResultTarget } from '../lib/handoffs';
import { icsFor, interpret, KIND_LABELS, vcfFor } from '../lib/interpret';

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
  const { copiedKey, copy } = useClipboard();
  const [revealed, setRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const link =
    info.fields.find(([l]) => l === 'URL')?.[1] ?? result.text.trim();
  const handoffs = resultHandoffs(result);
  const send = (target: ResultTarget) => {
    const payload = handoffs[target];
    if (payload) sendTo(navigate, target, payload);
  };

  return (
    <Card>
      <CardHeader>
        <Inline gap="2" align="center" wrap>
          <CardTitle as="h3">{KIND_LABELS[info.kind]}</CardTitle>
          <Badge variant="soft" tone="neutral" size="xs">
            {FORMAT_LABELS[result.format]}
          </Badge>
          <Badge variant="outline" tone="neutral" size="xs">
            Code {index + 1}
          </Badge>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Table aria-label={`Code ${index + 1} fields`}>
            <TableBody>
              {info.fields.map(([label, value], i) => (
                <TableRow key={`${label}-${i}`}>
                  <TableCell className="w-40 align-top text-fg-muted">
                    {label}
                  </TableCell>
                  <TableCell className="break-all whitespace-pre-wrap">
                    {info.secret !== undefined && label === 'Password' ? (
                      <SecretText
                        value={value}
                        revealed={revealed}
                        onRevealedChange={setRevealed}
                        copyable
                        label="WiFi password"
                      />
                    ) : (
                      value
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {info.kind !== 'text' &&
            info.kind !== 'url' &&
            info.secret === undefined && (
              <Code block className="break-all whitespace-pre-wrap">
                {result.text}
              </Code>
            )}
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={
                copiedKey === 'text' ? (
                  <IconCheck size="sm" />
                ) : (
                  <IconCopy size="sm" />
                )
              }
              onClick={() => void copy(result.text, 'text')}
            >
              Copy
            </Button>
            {info.actions.includes('open') && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconExternalLink size="sm" />}
                onClick={() => setConfirmOpen(true)}
              >
                Open link
              </Button>
            )}
            {handoffs['url-parser'] && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconLink size="sm" />}
                onClick={() => send('url-parser')}
              >
                Open in URL Inspector
              </Button>
            )}
            {handoffs['qr-code-generator'] && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconQrCode size="sm" />}
                onClick={() => send('qr-code-generator')}
              >
                Make QR
              </Button>
            )}
            {handoffs['url-encoder-decoder'] && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconType size="sm" />}
                onClick={() => send('url-encoder-decoder')}
              >
                Send to Text Encoder
              </Button>
            )}
            {info.actions.includes('vcf') && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconUser size="sm" />}
                onClick={() =>
                  saveBlob(
                    new Blob([vcfFor(result.text)], { type: 'text/vcard' }),
                    'contact.vcf',
                  )
                }
              >
                Add to contacts
              </Button>
            )}
            {info.actions.includes('ics') && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconCalendar size="sm" />}
                onClick={() =>
                  saveBlob(
                    new Blob([icsFor(result.text)], { type: 'text/calendar' }),
                    'event.ics',
                  )
                }
              >
                Save event
              </Button>
            )}
          </Inline>
        </Stack>
      </CardBody>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Open this link?</DialogTitle>
          <DialogDescription>
            Check the full address before you open it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Code block className="break-all">
            {link}
          </Code>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<IconExternalLink size="sm" />}
            onClick={() => {
              setConfirmOpen(false);
              window.open(link, '_blank', 'noopener,noreferrer');
            }}
          >
            Open
          </Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}
