import { useContext, useId, useState } from 'react';
import { IconCertificate, IconTimestamp } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Select,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import type { SignPlaceParams } from '@/pdf/doc/ops/sign-params';
import type { SigningIdentity } from '@/pdf/sign/pades/pkcs12';
import { SUMMARY_BLOCKED_REASON } from '@/pdf/sign/pades/summary-page';
import { useDocumentSignatures } from '../../signatures';
import { WorkspaceContext } from '../../workspace-context';
import type { DocumentApi } from '../types';
import { CertificateSummary } from './cert-meta';
import { CertificateDialog } from './CertificateDialog';
import {
  composeSignature,
  identityOf,
  settingsOf,
  signingBlocker,
  signingOn,
  type SignatureSettings,
} from './digital-signature-options';

interface Props {
  doc: DocumentApi;
  options: ExportOptions;
  set(patch: Partial<ExportOptions>): void;
}

export const DEVICE_CLOCK_NOTE =
  "The signing time will come from this device's clock.";

/** Placed signatures (sign.place) that can become the visible appearance. */
function placements(doc: DocumentApi) {
  const out: { value: string; label: string }[] = [];
  const view = doc.view;
  if (!view) return out;
  view.pages.forEach((p, i) => {
    for (const o of view.overlays.get(p.id) ?? [])
      if (o.type === 'sign.place' && !view.hidden.has(o.opId)) {
        const role =
          (o.params as SignPlaceParams).role === 'initials'
            ? 'Initials'
            : 'Signature';
        out.push({ value: o.opId, label: `${role} on page ${i + 1}` });
      }
  });
  return out;
}

/**
 * Export dialog "Digital signature" (plan H-14): a PAdES signature with a
 * .p12 or self-signed certificate. The identity is held in the dialog's
 * options only and cleared after the export (G25).
 */
export function DigitalSignatureSection({ doc, options, set }: Props) {
  const id = useId();
  const ws = useContext(WorkspaceContext);
  const { reports } = useDocumentSignatures(ws?.session ?? null);
  const [dialog, setDialog] = useState(false);
  const on = signingOn(options);
  const identity = identityOf(options);
  const s = settingsOf(options);
  const [chosenAt, setChosenAt] = useState(() => new Date());
  const apply = (patch: {
    on?: boolean;
    identity?: SigningIdentity | null;
    settings?: Partial<SignatureSettings>;
  }) => {
    const nextOn = patch.on ?? on;
    const nextId = patch.identity === undefined ? identity : patch.identity;
    const nextS = { ...s, ...patch.settings };
    set({
      signatureOn: nextOn,
      signatureIdentity: nextId ?? '',
      signatureSettings: nextS,
      signature: composeSignature(nextOn, nextId, nextS),
    });
  };
  const places = placements(doc);
  const signed = (reports ?? []).length > 0;
  const blocker = signingBlocker(options, doc.view);

  return (
    <Stack gap="3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${id}-on`}>Sign digitally (PAdES)</Label>
        <Switch
          id={`${id}-on`}
          checked={on}
          onCheckedChange={(v) => apply({ on: v })}
        />
      </div>
      {!on ? null : (
        <>
          {signed ? (
            <Alert status="warning">
              <AlertDescription>
                This document is already signed by{' '}
                {[
                  ...new Set(
                    reports!.map(
                      (r) => r.signer?.subjectCN || 'an unknown signer',
                    ),
                  ),
                ].join(', ')}
                . Saving other changes will make those signatures invalid.
              </AlertDescription>
            </Alert>
          ) : null}
          <Stack gap="2">
            {identity ? (
              <CertificateSummary info={identity.info} now={chosenAt} />
            ) : null}
            <div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconCertificate size="sm" />}
                onClick={() => setDialog(true)}
              >
                {identity ? 'Change certificate' : 'Choose certificate'}
              </Button>
            </div>
          </Stack>
          <Stack gap="1">
            <Label htmlFor={`${id}-ap`}>Appearance</Label>
            <Select
              id={`${id}-ap`}
              value={s.placementOpId ?? ''}
              onValueChange={(v) =>
                apply({ settings: { placementOpId: v || null } })
              }
              items={[{ value: '', label: 'Invisible signature' }, ...places]}
            />
          </Stack>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stack gap="1">
              <Label htmlFor={`${id}-reason`}>Reason</Label>
              <Input
                id={`${id}-reason`}
                value={s.reason}
                onChange={(v) => apply({ settings: { reason: v } })}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor={`${id}-loc`}>Location</Label>
              <Input
                id={`${id}-loc`}
                value={s.location}
                onChange={(v) => apply({ settings: { location: v } })}
              />
            </Stack>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${id}-caption`}>Caption under the signature</Label>
            <Switch
              id={`${id}-caption`}
              checked={s.caption}
              disabled={!s.placementOpId}
              onCheckedChange={(v) => apply({ settings: { caption: v } })}
            />
          </div>
          <Stack gap="1">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${id}-summary`}>
                Add a signing summary page
              </Label>
              <Switch
                id={`${id}-summary`}
                checked={s.summaryPage && !signed}
                disabled={signed}
                aria-describedby={signed ? `${id}-summary-why` : undefined}
                onCheckedChange={(v) => apply({ settings: { summaryPage: v } })}
              />
            </div>
            {signed ? (
              <Text id={`${id}-summary-why`} size="sm" tone="muted">
                {SUMMARY_BLOCKED_REASON}
              </Text>
            ) : null}
          </Stack>
          <Stack gap="2">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor={`${id}-ts`}
                className="inline-flex items-center gap-2"
              >
                <IconTimestamp size="sm" />
                Add a trusted timestamp (sends one request to the server below)
              </Label>
              <Switch
                id={`${id}-ts`}
                checked={s.timestamp}
                onCheckedChange={(v) => apply({ settings: { timestamp: v } })}
              />
            </div>
            {s.timestamp ? (
              <Stack gap="1">
                <Label htmlFor={`${id}-tsa`}>Timestamp server</Label>
                <Input
                  id={`${id}-tsa`}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={s.timestampUrl}
                  onChange={(v) => apply({ settings: { timestampUrl: v } })}
                />
                <Text size="sm" tone="muted">
                  Enter a timestamp server that allows browser requests. Only a
                  hash of the signature is sent, never the document.
                </Text>
              </Stack>
            ) : (
              <Text size="sm" tone="muted">
                {DEVICE_CLOCK_NOTE}
              </Text>
            )}
          </Stack>
          {blocker ? (
            <Alert status="info">
              <AlertDescription>{blocker}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
      <CertificateDialog
        open={dialog}
        onOpenChange={setDialog}
        onIdentity={(identity) => {
          setChosenAt(new Date());
          apply({ identity });
        }}
      />
    </Stack>
  );
}
