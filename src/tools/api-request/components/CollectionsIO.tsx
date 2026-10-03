import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilePicker,
  IconButton,
} from '@/shared/ui';
import {
  IconDownload,
  IconMoreHorizontal,
  IconUpload,
} from '@/shared/ui/icons';
import type { Folder } from '../lib/collections-migrate';
import type { Environment } from '../lib/env';
import { exportNative, importCollectionsFile } from '../lib/io';
import { exportPostman } from '../lib/postman';

interface Props {
  collections: Folder[];
  environment?: Environment;
  onImport(collections: Folder[], environment: Environment | null): void;
}

/** Import Postman v2.1 or this tool's JSON; export either. */
export function CollectionsIO({ collections, environment, onImport }: Props) {
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
  const exportAs = (kind: 'postman' | 'native') =>
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
    <FilePicker
      accept=".json,application/json"
      onFiles={(f) => f[0] && void load(f[0])}
    >
      {(open) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <IconButton
              size="sm"
              variant="ghost"
              label="Import and export"
              icon={IconMoreHorizontal}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={open}>
              <IconUpload size="sm" aria-hidden />
              Import collections
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!collections.length}
              onClick={() => exportAs('postman')}
            >
              <IconDownload size="sm" aria-hidden />
              Export for Postman
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!collections.length}
              onClick={() => exportAs('native')}
            >
              <IconDownload size="sm" aria-hidden />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </FilePicker>
  );
}
