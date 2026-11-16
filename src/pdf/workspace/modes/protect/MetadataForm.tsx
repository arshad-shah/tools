import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  DescriptionList,
  Inline,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { eraser, save as saveIcon } from '@arshad-shah/cynosure/icons';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { ErrorNotice, LoadingLine } from '../../ui/states';
import { metadataOf, PROPERTY_FIELDS } from '@/pdf/doc/ops/protect';
import type {
  MetadataField,
  MetadataPatch,
  PdfMetadata,
} from '@/pdf/edit/metadata';
import { effectiveValues } from './protect-ui';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';

const LABELS: Record<MetadataField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator (application)',
  producer: 'Producer',
};

type Values = Record<MetadataField, string>;

const when = (d: Date | null) => (d ? d.toLocaleString() : 'Not set');

/**
 * "Document properties" (Protect mode inspector): the phase-3 metadata
 * fields, read from the current base in the edit worker and changed through
 * `meta.set` (undoable, written at export).
 */
export function MetadataForm({ doc }: ModeProps) {
  const ws = useWorkspace();
  const checkpoint = doc.view.checkpoint;
  const [base, setBase] = useState<{
    checkpoint: string;
    meta: PdfMetadata | null;
    error: ToolError | null;
  } | null>(null);
  const [edits, setEdits] = useState<Partial<Values>>({});

  useEffect(() => {
    const { model, blobs, services } = ws.session;
    const ctrl = new AbortController();
    const ckpt = model.currentCheckpoint();
    blobs
      .checkpointBytes(ckpt.id)
      .then((bytes) =>
        services.edit.call('getMetadata', [bytes.slice()], {
          signal: ctrl.signal,
        }),
      )
      .then(
        (meta) =>
          !ctrl.signal.aborted && setBase({ checkpoint, meta, error: null }),
        (e) =>
          !ctrl.signal.aborted &&
          setBase({ checkpoint, meta: null, error: toToolError(e) }),
      );
    return () => ctrl.abort();
  }, [ws.session, checkpoint]);

  if (!base || base.checkpoint !== checkpoint)
    return <LoadingLine label="Reading document properties" />;
  if (!base.meta) return <ErrorNotice error={base.error!} />;

  const pending = metadataOf(doc.view);
  const current = effectiveValues(base.meta, pending);
  const values = { ...current, ...edits };
  const changed: MetadataPatch = Object.fromEntries(
    PROPERTY_FIELDS.filter((f) => values[f] !== current[f]).map((f) => [
      f,
      values[f],
    ]),
  );
  const dirty = Object.keys(changed).length > 0;
  const restricted = doc.state.restricted;

  const save = () => {
    if (doc.dispatch({ type: 'meta.set', params: { patch: changed } }).length)
      setEdits({});
  };
  const removeAll = () => {
    if (
      doc.dispatch({ type: 'meta.set', params: { patch: {}, removeAll: true } })
        .length
    )
      setEdits({});
  };

  return (
    <Stack gap="4">
      {PROPERTY_FIELDS.map((f) => (
        <TextField
          key={f}
          label={LABELS[f]}
          size="sm"
          value={values[f]}
          disabled={restricted}
          onChange={(v) => setEdits((e) => ({ ...e, [f]: v }))}
        />
      ))}
      <DescriptionList
        size="sm"
        layout="inline"
        items={[
          {
            id: 'created',
            term: 'Created',
            detail: pending.removeAll
              ? 'Not set'
              : when(base.meta.creationDate),
          },
          {
            id: 'modified',
            term: 'Modified',
            detail: when(base.meta.modificationDate),
          },
        ]}
      />
      {base.meta.hasXmp && !pending.removeAll ? (
        <Stack gap="1" align="start">
          <Badge tone="info" size="sm">
            XMP metadata present
          </Badge>
          <Text size="sm" tone="muted">
            Saving rewrites it from these fields. Other XMP properties are
            removed, except the PDF/A and PDF/UA identification.
          </Text>
        </Stack>
      ) : null}
      <Inline gap="2" wrap>
        <Button
          variant="solid"
          tone="accent"
          size="sm"
          icon={saveIcon}
          disabled={!dirty || restricted}
          onClick={save}
        >
          Save properties
        </Button>
        <Button
          variant="outline"
          tone="danger"
          size="sm"
          icon={eraser}
          disabled={restricted}
          onClick={removeAll}
        >
          Remove all properties
        </Button>
      </Inline>
      <Text size="sm" tone="muted">
        Changes are written when you export and can be undone until then.
        Removing clears the Info and XMP metadata; metadata inside pages or
        images (such as photo EXIF) is not touched.
      </Text>
    </Stack>
  );
}
