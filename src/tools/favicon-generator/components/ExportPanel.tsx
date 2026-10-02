import { useId } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  ColorField,
  CopyButton,
  Inline,
  Input,
  Label,
  Stack,
  Text,
} from '@/shared/ui';
import { IconDownload } from '@/shared/ui/icons';

export interface ExportPanelProps {
  name: string;
  onNameChange(v: string): void;
  shortName: string;
  onShortNameChange(v: string): void;
  themeColor: string;
  backgroundColor: string;
  onColours(patch: { themeColor?: string; backgroundColor?: string }): void;
  snippet: string;
  canDownload: boolean;
  downloading: boolean;
  /** Why the last download failed. */
  error: string | null;
  onDownload(): void;
}

/** Web manifest fields, the ZIP download and the link tags. */
export function ExportPanel(p: ExportPanelProps) {
  const nameId = useId();
  const shortId = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Manifest and export</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Inline gap="3" wrap>
            <Stack gap="1" className="min-w-48 flex-1">
              <Label htmlFor={nameId}>App name</Label>
              <Input
                id={nameId}
                value={p.name}
                onChange={p.onNameChange}
                placeholder="My app"
              />
            </Stack>
            <Stack gap="1" className="min-w-36 flex-1">
              <Label htmlFor={shortId}>Short name</Label>
              <Input
                id={shortId}
                value={p.shortName}
                onChange={p.onShortNameChange}
                placeholder="App"
              />
            </Stack>
          </Inline>
          <Inline gap="3" wrap>
            <ColorField
              label="Theme colour"
              value={p.themeColor}
              onChange={(themeColor) => p.onColours({ themeColor })}
              defaultFormat="hex"
            />
            <ColorField
              label="Manifest background colour"
              value={p.backgroundColor}
              onChange={(backgroundColor) => p.onColours({ backgroundColor })}
              defaultFormat="hex"
            />
          </Inline>
          <Inline gap="2" wrap>
            <Button
              variant="primary"
              leftIcon={<IconDownload size="sm" />}
              disabled={!p.canDownload}
              loading={p.downloading}
              onClick={p.onDownload}
            >
              Download ZIP
            </Button>
            <CopyButton
              variant="text"
              size="md"
              label="snippet"
              value={p.snippet}
            />
          </Inline>
          {p.error ? (
            <Alert status="danger">
              <AlertDescription>{p.error}</AlertDescription>
            </Alert>
          ) : null}
          <Stack gap="1">
            <Text size="sm" weight="medium">
              HTML for the page head
            </Text>
            <Code block aria-label="HTML snippet" data-testid="html-snippet">
              {p.snippet}
            </Code>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
