import React, { useEffect, useMemo, useState } from 'react';
import { IconFormInput } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Label,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { logToolError, toToolError, type ToolError } from '@/shared/lib/errors';
import { useJob } from '@/shared/state/useJob';
import { fillForm, listFormFields, type FormField } from '@/pdf/edit';
import {
  JobPanel,
  PdfFileHeader,
  ResultFiles,
  type ResultFile,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import { FieldControl } from './components/FieldControl';
import { changedValues, initialValues, type FormValues } from './lib/values';
import { useHandoff } from '@/shared/lib/handoff';

interface Listing {
  file: PdfInputFile;
  fields: FormField[];
  initial: FormValues;
  error: ToolError | null;
}

const PdfFillFormTool: React.FC<ToolProps> = () => {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [flatten, setFlatten] = useState(false);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    listFormFields(file.bytes).then(
      (fields) => {
        if (!alive) return;
        const initial = initialValues(fields);
        setListing({ file, fields, initial, error: null });
        setValues(initial);
      },
      (e) => {
        if (!alive) return;
        const error = toToolError(e);
        logToolError(error);
        setListing({ file, fields: [], initial: {}, error });
      },
    );
    return () => {
      alive = false;
    };
  }, [file]);

  const current = listing && listing.file === file ? listing : null;
  const fields = useMemo(() => current?.fields ?? [], [current]);
  const fillable = fields.filter((f) => f.kind !== 'unsupported');
  const unsupported = fields.filter(
    (f): f is Extract<FormField, { kind: 'unsupported' }> =>
      f.kind === 'unsupported',
  );

  const job = useJob(
    async (
      _ctx,
      source: PdfInputFile,
      changes: FormValues,
      flat: boolean,
    ): Promise<ResultFile> => {
      const bytes = await fillForm(source.bytes, changes, { flatten: flat });
      const n = Object.keys(changes).length;
      return {
        name: deriveFilename(source.name, 'filled', 'pdf'),
        bytes,
        detail: `${n} ${n === 1 ? 'field' : 'fields'} changed${flat ? ' · flattened' : ''}`,
      };
    },
  );

  const pick = (picked: PdfInputFile) => {
    job.reset();
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            initialFiles={handed}
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={file !== null && current === null}
            error={current?.error ?? null}
          />
          {current && !current.error && (
            <>
              {fillable.length === 0 ? (
                <Alert status="info">
                  <AlertDescription>
                    This PDF has no fillable form fields.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Grid max={2} gap="4">
                    {fields.map((field, i) =>
                      field.kind === 'unsupported' ? null : (
                        <FieldControl
                          key={field.name}
                          id={`field-${i}`}
                          field={field}
                          value={values[field.name]}
                          disabled={job.status === 'running'}
                          onChange={(v) => {
                            job.reset();
                            setValues((prev) => ({ ...prev, [field.name]: v }));
                          }}
                        />
                      ),
                    )}
                  </Grid>
                  <Inline gap="3" align="center">
                    <Switch
                      id="ff-flatten"
                      aria-label="Flatten form (fields become part of the page and can't be edited)"
                      checked={flatten}
                      onCheckedChange={(on) => {
                        job.reset();
                        setFlatten(on);
                      }}
                    />
                    <Label htmlFor="ff-flatten">
                      Flatten form (fields become part of the page and can't be
                      edited)
                    </Label>
                  </Inline>
                  <Button
                    variant="primary"
                    leftIcon={<IconFormInput size="sm" />}
                    disabled={job.status === 'running'}
                    onClick={() =>
                      job.run(
                        current.file,
                        changedValues(fields, values, current.initial),
                        flatten,
                      )
                    }
                  >
                    Fill &amp; download
                  </Button>
                </>
              )}
              {unsupported.length > 0 && (
                <Text size="sm" tone="muted">
                  Not fillable here:{' '}
                  {unsupported
                    .map((f) => `${f.label ?? f.name} (${f.type})`)
                    .join(', ')}
                </Text>
              )}
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Filling">
            {job.result && (
              <ResultFiles
                note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
                files={[job.result]}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfFillFormTool;
