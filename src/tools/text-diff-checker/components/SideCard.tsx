import { Card, FileDrop, Stack } from '@arshad-shah/cynosure';
import { detectLanguage } from '../lib/detect';
import { CodeEditor } from '@/shared/editor';

const TEXT_ACCEPT =
  '.txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log,.csv,.patch,.diff,text/plain';

const DEFAULT_NAME = { left: 'original', right: 'changed' } as const;

export interface SideCardProps {
  side: 'left' | 'right';
  value: string;
  onChange(text: string): void;
  /** The side's name: "original" or "changed", or the file it came from. */
  name: string;
  syntaxHighlighting: boolean;
  onOpen(file: File): void;
}

/**
 * One side of the comparison. Empty, it offers a drop zone; filled, Open
 * file moves to the card header so a file can still replace the text.
 */
export function SideCard({
  side,
  value,
  onChange,
  name,
  syntaxHighlighting,
  onOpen,
}: SideCardProps) {
  const label = side === 'left' ? 'Original text' : 'Changed text';
  const open = (files: File[]) => {
    if (files[0]) onOpen(files[0]);
  };
  return (
    <Card
      as="section"
      title={side === 'left' ? 'Original' : 'Changed'}
      description={name === DEFAULT_NAME[side] ? undefined : name}
      headingLevel={2}
      padding="sm"
      actions={
        value !== '' ? (
          <FileDrop
            variant="button"
            size="sm"
            accept={TEXT_ACCEPT}
            labels={{ choose: 'Open file', chooseOne: 'Open file' }}
            onFiles={open}
          />
        ) : undefined
      }
    >
      <Stack gap="3">
        <CodeEditor
          value={value}
          onChange={onChange}
          language={syntaxHighlighting ? detectLanguage(value, name) : 'plain'}
          aria-label={label}
          placeholder="Paste or type text"
          minHeight={160}
          maxHeight={280}
        />
        {value === '' ? (
          <FileDrop
            size="sm"
            accept={TEXT_ACCEPT}
            labels={{
              prompt: 'Drop a text file here, or',
              chooseOne: 'Open a file',
            }}
            onFiles={open}
          />
        ) : null}
      </Stack>
    </Card>
  );
}
