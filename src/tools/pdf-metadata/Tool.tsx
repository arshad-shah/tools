import React, { useEffect, useState } from 'react';
import { Eraser, Save } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  Label,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useJob } from '@/shared/state/useJob';
import {
  getMetadata,
  METADATA_FIELDS,
  setMetadata,
  stripMetadata,
  type MetadataField,
  type MetadataPatch,
  type PdfMetadata,
} from '@/pdf/edit';
import {
  JobPanel,
  PdfFileHeader,
  ResultFiles,
  UNENCRYPTED_NOTE,
  type PdfInputFile,
  type ResultFile,
} from '@/pdf/components';

const LABELS: Record<MetadataField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator (application)',
  producer: 'Producer',
};

type Values = Record<MetadataField, string>;
type Action = { kind: 'save'; patch: MetadataPatch } | { kind: 'strip' };

interface Loaded {
  file: PdfInputFile;
  meta: PdfMetadata | null;
  error: ToolError | null;
}

const valuesOf = (m: PdfMetadata): Values =>
  Object.fromEntries(METADATA_FIELDS.map((f) => [f, m[f]])) as Values;

const when = (d: Date | null) => (d ? d.toLocaleString() : '—');

const PdfMetadataTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [values, setValues] = useState<Values | null>(null);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    getMetadata(file.bytes).then(
      (meta) => {
        if (!alive) return;
        setLoaded({ file, meta, error: null });
        setValues(valuesOf(meta));
      },
      (e) => {
        if (alive) setLoaded({ file, meta: null, error: toToolError(e) });
      },
    );
    return () => {
      alive = false;
    };
  }, [file]);

  const job = useJob(
    async (ctx, source: PdfInputFile, action: Action): Promise<ResultFile> => {
      const bytes =
        action.kind === 'save'
          ? await setMetadata(source.bytes, action.patch)
          : await stripMetadata(source.bytes);
      ctx.signal.throwIfAborted();
      return {
        name: deriveFilename(
          source.name,
          action.kind === 'save' ? 'metadata' : 'no-metadata',
          'pdf',
        ),
        bytes,
      };
    },
  );

  const current = loaded?.file === file ? loaded : null;
  const meta = current?.meta ?? null;

  const pick = (picked: PdfInputFile) => {
    job.reset();
    setValues(null);
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setValues(null);
    setFile(null);
  };
  const edit = (field: MetadataField, value: string) => {
    job.reset();
    setValues((v) => (v ? { ...v, [field]: value } : v));
  };
  /** Only the fields the user changed, so untouched ones keep their bytes. */
  const changed = (): MetadataPatch => {
    if (!meta || !values) return {};
    return Object.fromEntries(
      METADATA_FIELDS.filter((f) => values[f] !== meta[f]).map((f) => [
        f,
        values[f],
      ]),
    );
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={!!file && !current}
            error={current?.error ?? null}
          />
          {file && meta && values && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {METADATA_FIELDS.map((f) => (
                  <Stack key={f} gap="2">
                    <Label htmlFor={`meta-${f}`}>{LABELS[f]}</Label>
                    <Input
                      id={`meta-${f}`}
                      value={values[f]}
                      onChange={(v) => edit(f, v)}
                    />
                  </Stack>
                ))}
              </div>
              <Stack gap="1">
                <Text size="sm" tone="muted">
                  Created: {when(meta.creationDate)}
                </Text>
                <Text size="sm" tone="muted">
                  Modified: {when(meta.modificationDate)}
                </Text>
              </Stack>
              {meta.hasXmp && (
                <Inline gap="2" align="center" wrap>
                  <Badge tone="info">XMP metadata present</Badge>
                  <Text size="sm" tone="muted">
                    It will be updated to match.
                  </Text>
                </Inline>
              )}
              <Inline gap="3" wrap>
                <Button
                  variant="solid"
                  leftIcon={<Save size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() =>
                    job.run(file, { kind: 'save', patch: changed() })
                  }
                >
                  Save metadata
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<Eraser size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() => job.run(file, { kind: 'strip' })}
                >
                  Remove all metadata
                </Button>
              </Inline>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Saving">
            {job.result && (
              <ResultFiles
                files={[job.result]}
                note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfMetadataTool;
