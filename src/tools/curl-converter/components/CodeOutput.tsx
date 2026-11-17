import {
  CodeBlock,
  CopyButton,
  IconButton,
  Inline,
  List,
  Notice,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { saveBlob } from '@/shared/lib/download';
import type { Generated, Target, TargetId } from '../lib/targets';
import { TARGETS } from '../lib/targets';

interface Props {
  target: Target;
  onTarget(id: TargetId): void;
  output: Generated;
}

/** The generated code in the chosen language, with Copy and Download. */
export function CodeOutput({ target, onTarget, output }: Props) {
  const filename = `request.${target.extension}`;
  return (
    <Stack gap="4">
      <Select
        label="Convert to"
        value={target.id}
        onChange={(v) => onTarget(v as TargetId)}
        options={TARGETS.map((t) => ({ value: t.id, label: t.label }))}
      />
      <CodeBlock
        title={target.label}
        code={output.code}
        language={target.language}
        wrap
        copyable={false}
        actions={
          <Inline gap="1">
            <CopyButton
              size="sm"
              value={output.code}
              labels={{ copy: `Copy the ${target.label} code` }}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={download}
              label={`Download ${filename}`}
              onClick={() =>
                saveBlob(
                  new Blob([output.code], { type: 'text/plain' }),
                  filename,
                )
              }
            />
          </Inline>
        }
      />
      {output.notes.length ? (
        <Notice tone="info" title={`Notes for ${target.label}`}>
          <List
            gap="sm"
            items={output.notes.map((n, i) => ({ id: `${i}`, label: n }))}
          />
        </Notice>
      ) : null}
    </Stack>
  );
}
