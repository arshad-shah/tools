import { FileInputBase, IconButton, Menu } from '@arshad-shah/cynosure';
import { download, moreHorizontal, upload } from '@arshad-shah/cynosure/icons';
import { useRef } from 'react';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import type { Folder } from '../lib/collections-migrate';
import type { Environment } from '../lib/env';
import { exportNative, importCollectionsFile } from '../lib/io';
import { exportPostman } from '../lib/postman';

interface Props {
  collections: Folder[];
  environment?: Environment;
  onImport(collections: Folder[], environment: Environment | null): void;
}

/**
 * Import Postman v2.1 or this tool's JSON; export either. The import picks
 * a file through a hidden file input (Cynosure has no file-picker button:
 * docs/cynosure-gaps.md).
 */
export function CollectionsIO({ collections, environment, onImport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const load = async (file: File) => {
    try {
      const r = importCollectionsFile(await readText(file));
      onImport(r.collections, r.environment);
      notify.success(
        `Imported ${r.collections.length} ${r.collections.length === 1 ? 'collection' : 'collections'}`,
      );
      if (r.unsupported.length)
        notify.info(`Not imported: ${r.unsupported.join(', ')}`);
    } catch (e) {
      notify.error(toToolError(e, 'Could not import this file'));
    }
  };
  const exportAs = (kind: string) =>
    kind === 'postman'
      ? saveBlob(
          new Blob([exportPostman(collections, { environment })], {
            type: 'application/json',
          }),
          'collections.postman.json',
        )
      : saveBlob(
          new Blob([exportNative(collections)], { type: 'application/json' }),
          'collections.json',
        );
  return (
    <>
      <FileInputBase
        ref={input}
        hidden
        accept=".json,application/json"
        aria-label="Collections file"
        onFiles={(f) => f[0] && void load(f[0])}
      />
      <Menu
        label="Import and export"
        items={[
          { value: 'import', label: 'Import collections', icon: upload },
          {
            value: 'postman',
            label: 'Export for Postman',
            icon: download,
            disabled: !collections.length,
          },
          {
            value: 'native',
            label: 'Export as JSON',
            icon: download,
            disabled: !collections.length,
          },
        ]}
        onSelect={(v) =>
          v === 'import' ? input.current?.click() : exportAs(v)
        }
        trigger={(props) => (
          <IconButton
            {...props}
            size="sm"
            variant="ghost"
            tone="neutral"
            label="Import and export"
            icon={moreHorizontal}
          />
        )}
      />
    </>
  );
}
