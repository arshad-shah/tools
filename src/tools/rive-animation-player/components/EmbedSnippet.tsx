import { IconCheck, IconCopy } from '@/shared/ui/icons';
import {
  Button,
  CodeSurface,
  Inline,
  SegmentedControl,
  Stack,
  Text,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';

export type SnippetRuntime = 'react' | 'web';

/** The code to show this file, artboard and state machine in an app. */
export function EmbedSnippet({
  code,
  runtime,
  onRuntimeChange,
}: {
  code: string;
  runtime: SnippetRuntime;
  onRuntimeChange: (r: SnippetRuntime) => void;
}) {
  const { copied, copy } = useClipboard();
  return (
    <Stack gap="2">
      <Inline justify="between" align="center" gap="2" wrap>
        <SegmentedControl
          label="Runtime"
          size="sm"
          value={runtime}
          onChange={onRuntimeChange}
          options={[
            { value: 'react', label: 'React' },
            { value: 'web', label: 'Web' },
          ]}
        />
        <Button
          variant="secondary"
          size="sm"
          leftIcon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
          onClick={() => void copy(code)}
        >
          {copied ? 'Copied' : 'Copy snippet'}
        </Button>
      </Inline>
      <CodeSurface
        label="Embed snippet"
        value={code}
        language={runtime === 'react' ? 'ts' : 'html'}
        readOnly
        wrap
        maxHeight={280}
      />
      <Text size="xs" tone="subtle">
        Serve the .riv file from your app at the path in src. Install{' '}
        {runtime === 'react' ? '@rive-app/react-canvas' : '@rive-app/canvas'}{' '}
        first.
      </Text>
    </Stack>
  );
}
