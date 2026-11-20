import { Badge, CodeBlock, IconButton, Stack } from '@arshad-shah/cynosure';
import { download, lock } from '@arshad-shah/cynosure/icons';
import { copyText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { KeyExport } from '../lib/files';

const copy = async (text: string) => {
  try {
    await copyText(text);
  } catch (e) {
    notify.error(e instanceof ToolError ? e : 'Could not copy to clipboard');
    throw e;
  }
};

/** Each export as a code block with copy and download. */
export function ExportList({ exports }: { exports: KeyExport[] }) {
  return (
    <Stack gap="5">
      {exports.map((e) => (
        <CodeBlock
          key={e.id}
          title={e.label}
          code={e.text.trimEnd()}
          wrap
          maxLines={e.id === 'openssh' ? undefined : 6}
          copy={copy}
          labels={{ copy: `Copy ${e.label.toLowerCase()}` }}
          actions={
            <>
              {e.secret ? (
                <Badge tone="warning" icon={lock} size="sm">
                  Secret
                </Badge>
              ) : null}
              <IconButton
                size="sm"
                variant="ghost"
                tone="neutral"
                icon={download}
                label={`Download ${e.label.toLowerCase()} as ${e.filename}`}
                onClick={() => saveBlob(utf8Encode(e.text), e.filename, e.mime)}
              />
            </>
          }
        />
      ))}
    </Stack>
  );
}
