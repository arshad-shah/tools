import { useContext, useState } from 'react';
import {
  certificate as certificateIcon,
  timer,
} from '@arshad-shah/cynosure/icons';
import {
  Button,
  Grid,
  Inline,
  Notice,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
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

  const NONE = 'none';
  return (
    <Stack gap="4">
      <Switch
        label="Sign digitally (PAdES)"
        checked={on}
        onChange={(v) => apply({ on: v })}
      />
      {!on ? null : (
        <>
          {signed ? (
            <Notice tone="warning" size="sm">
              {`This document is already signed by ${[
                ...new Set(
                  reports!.map(
                    (r) => r.signer?.subjectCN || 'an unknown signer',
                  ),
                ),
              ].join(
                ', ',
              )}. Saving other changes will make those signatures invalid.`}
            </Notice>
          ) : null}
          <Stack gap="3">
            {identity ? (
              <CertificateSummary info={identity.info} now={chosenAt} />
            ) : null}
            <Inline>
              <Button
                variant="outline"
                size="sm"
                icon={certificateIcon}
                onClick={() => setDialog(true)}
              >
                {identity ? 'Change certificate' : 'Choose certificate'}
              </Button>
            </Inline>
          </Stack>
          <Select
            label="Appearance"
            value={s.placementOpId ?? NONE}
            onChange={(v) =>
              apply({ settings: { placementOpId: v === NONE ? null : v } })
            }
            options={[{ value: NONE, label: 'Invisible signature' }, ...places]}
          />
          <Grid columns={2} minItemWidth="12rem" gap="4">
            <TextField
              label="Reason"
              value={s.reason}
              onChange={(v) => apply({ settings: { reason: v } })}
            />
            <TextField
              label="Location"
              value={s.location}
              onChange={(v) => apply({ settings: { location: v } })}
            />
          </Grid>
          <Switch
            label="Caption under the signature"
            checked={s.caption}
            disabled={!s.placementOpId}
            onChange={(v) => apply({ settings: { caption: v } })}
          />
          <Switch
            label="Add a signing summary page"
            description={signed ? SUMMARY_BLOCKED_REASON : undefined}
            checked={s.summaryPage && !signed}
            disabled={signed}
            onChange={(v) => apply({ settings: { summaryPage: v } })}
          />
          <Stack gap="2">
            <Switch
              label="Add a trusted timestamp (sends one request to the server below)"
              checked={s.timestamp}
              onChange={(v) => apply({ settings: { timestamp: v } })}
            />
            {s.timestamp ? (
              <TextField
                label="Timestamp server"
                type="url"
                inputMode="url"
                placeholder="https://"
                iconStart={timer}
                value={s.timestampUrl}
                onChange={(v) => apply({ settings: { timestampUrl: v } })}
                description="Enter a timestamp server that allows browser requests. Only a hash of the signature is sent, never the document."
              />
            ) : (
              <Text as="p" size="sm" tone="muted">
                {DEVICE_CLOCK_NOTE}
              </Text>
            )}
          </Stack>
          {blocker ? (
            <Notice tone="info" size="sm">
              {blocker}
            </Notice>
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
