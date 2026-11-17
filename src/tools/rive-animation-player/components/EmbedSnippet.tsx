import {
  CodeBlock,
  IconButton,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { saveBlob } from '@/shared/lib/download';

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
  const react = runtime === 'react';
  return (
    <Stack gap="3">
      <SegmentedControl
        label="Runtime"
        size="sm"
        value={runtime}
        onChange={(v) => onRuntimeChange(v as SnippetRuntime)}
        options={[
          { value: 'react', label: 'React' },
          { value: 'web', label: 'Web' },
        ]}
      />
      <CodeBlock
        title="Embed snippet"
        code={code}
        language={react ? 'tsx' : 'html'}
        wrap
        copyable
        actions={
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={download}
            label="Download"
            onClick={() =>
              saveBlob(
                new Blob([code], { type: react ? 'text/plain' : 'text/html' }),
                react ? 'RiveEmbed.tsx' : 'rive-embed.html',
              )
            }
          />
        }
      />
      <Text size="sm" tone="muted">
        {`Serve the .riv file from your app at the path in src. Install ${react ? '@rive-app/react-canvas' : '@rive-app/canvas'} first.`}
      </Text>
    </Stack>
  );
}
