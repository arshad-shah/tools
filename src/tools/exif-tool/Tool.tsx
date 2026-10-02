import { useState } from 'react';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Container,
  DropZone,
  Grid,
  Inline,
  Label,
  LoadingState,
  PrivacyNote,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { IconImage, IconTrash } from '@/shared/ui/icons';
import type { StripOptions } from './lib/strip';
import { MetaTables } from './components/MetaTables';
import { RiskSummary } from './components/RiskSummary';
import { StripPanel } from './components/StripPanel';
import { useExifFiles } from './components/useExifFiles';

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.tif,.tiff';

export default function ExifTool() {
  const files = useExifFiles();
  const { entries, selected } = files;
  const [options, setOptions] = useState<Required<StripOptions>>({
    keepIcc: true,
    keepOrientation: false,
  });
  useHandoffFiles(files.addFiles);

  useToolCommands('exif-tool', [
    {
      id: 'strip',
      label: 'Remove metadata',
      run: () => void files.strip(options),
      enabled: entries.length > 0 && !files.running,
    },
    {
      id: 'zip',
      label: 'Download ZIP',
      run: () => void files.downloadZip(),
      enabled: files.doneEntries.length > 0,
    },
    {
      id: 'clear',
      label: 'Clear',
      run: files.clear,
      enabled: entries.length > 0,
    },
  ]);

  return (
    <Container size="full">
      <Stack gap="4">
        <DropZone
          variant={entries.length ? 'inline' : 'hero'}
          onFiles={files.addFiles}
          accept={ACCEPT}
          multiple
          icon={IconImage}
          title="Drop photos here"
          hint="JPEG, PNG and WebP can be cleaned; HEIC, AVIF and TIFF are read only"
        />
        <PrivacyNote variant="local">
          Metadata is read and removed on this device.
        </PrivacyNote>

        {selected ? (
          <>
            <Inline gap="3" align="end" wrap>
              <Box className="min-w-64 flex-1">
                <Stack gap="1">
                  <Label htmlFor="exif-file">File</Label>
                  <Select
                    id="exif-file"
                    value={selected.id}
                    onValueChange={files.select}
                    items={entries.map((e) => ({
                      value: e.id,
                      label: e.file.name,
                    }))}
                  />
                </Stack>
              </Box>
              <Button
                variant="ghost"
                leftIcon={<IconTrash size="sm" />}
                onClick={files.clear}
              >
                Clear
              </Button>
            </Inline>

            <Grid max={3} gap="4">
              <Box className="lg:col-span-2">
                {selected.readError ? (
                  <Alert status="danger">
                    <AlertDescription>{selected.readError}</AlertDescription>
                  </Alert>
                ) : selected.meta ? (
                  <MetaTables meta={selected.meta} />
                ) : (
                  <LoadingState label="Reading metadata" />
                )}
              </Box>
              <Stack gap="4">
                {selected.risk ? <RiskSummary risk={selected.risk} /> : null}
                {selected.meta ? (
                  <Text size="sm" tone="muted">
                    Format: {selected.meta.format.toUpperCase()}
                  </Text>
                ) : null}
              </Stack>
            </Grid>

            <StripPanel
              files={files}
              options={options}
              onOptionsChange={setOptions}
            />
          </>
        ) : null}
      </Stack>
    </Container>
  );
}
