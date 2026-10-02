import {
  Inline,
  SegmentedControl,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';

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
      </Inline>
      {/* Read-only output: Copy and Download come with the panel. */}
      <TextInputPanel
        readOnly
        label="Embed snippet"
        value={code}
        onChange={() => {}}
        language={runtime === 'react' ? 'ts' : 'html'}
        downloadName={runtime === 'react' ? 'RiveEmbed.tsx' : 'rive-embed.html'}
        wrap
        minHeight={120}
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
