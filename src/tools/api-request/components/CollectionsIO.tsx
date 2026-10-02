import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import { Button, FilePicker, Inline } from '@/shared/ui';
import { IconDownload, IconUpload } from '@/shared/ui/icons';
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
  return (
    <Inline gap="1" wrap>
      <FilePicker
        accept=".json,application/json"
        onFiles={(f) => f[0] && void load(f[0])}
      >
        {(open) => (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconUpload size="sm" />}
            onClick={open}
          >
            Import
          </Button>
        )}
      </FilePicker>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<IconDownload size="sm" />}
        disabled={!collections.length}
        onClick={() =>
          saveBlob(
            new Blob([exportPostman(collections, { environment })], {
              type: 'application/json',
            }),
            'collections.postman.json',
          )
        }
      >
        Postman
      </Button>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<IconDownload size="sm" />}
        disabled={!collections.length}
        onClick={() =>
          saveBlob(
            new Blob([exportNative(collections)], { type: 'application/json' }),
            'collections.json',
          )
        }
      >
        JSON
      </Button>
    </Inline>
  );
}
