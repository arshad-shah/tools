import {
  Button,
  Card,
  FileDrop,
  Inline,
  Menu,
  Notice,
  ProgressBar,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { moreHorizontal } from '@arshad-shah/cynosure/icons';
import type { SchemaTable } from '../lib/engine';
import type { useSqlDatabase } from '../hooks/useSqlDatabase';
import { MAX_FILE_BYTES } from '../hooks/useSqlDatabase';
import { SchemaList } from './SchemaList';

const ACCEPT =
  '.csv,.tsv,.tab,.json,.ndjson,.jsonl,.txt,.sqlite,.sqlite3,.db,.db3,.s3db,text/csv,text/tab-separated-values,application/json';

interface DatabasePanelProps {
  db: ReturnType<typeof useSqlDatabase>;
  onFiles(files: File[]): void;
  onQuery(table: SchemaTable): void;
  onMenu(action: 'sample' | 'new' | 'download'): void;
}

/** Load files into the database and see its tables. */
export function DatabasePanel({
  db,
  onFiles,
  onQuery,
  onMenu,
}: DatabasePanelProps) {
  const { load } = db;
  const running = load.status === 'running';
  const empty = db.tables.length === 0;
  return (
    <Card
      as="section"
      title="Database"
      headingLevel={2}
      padding="sm"
      actions={
        // An empty database has nothing to reset or download; its empty
        // state offers the sample tables instead.
        empty ? undefined : (
          <Menu
            label="Database actions"
            items={[
              { value: 'sample', label: 'Load sample tables' },
              { value: 'new', label: 'New empty database' },
              { value: 'download', label: 'Download database (.sqlite)' },
            ]}
            onSelect={(v) => onMenu(v as 'sample' | 'new' | 'download')}
            trigger={(props) => (
              <Button
                {...props}
                size="sm"
                variant="ghost"
                icon={moreHorizontal}
              >
                More
              </Button>
            )}
          />
        )
      }
    >
      <Stack gap="3">
        <FileDrop
          size="sm"
          multiple
          accept={ACCEPT}
          maxSize={MAX_FILE_BYTES}
          disabled={running}
          labels={{
            prompt: 'Drop CSV, TSV, JSON or SQLite files here, or',
            choose: 'Open files',
            chooseOne: 'Open a file',
          }}
          onFiles={(files) => files.length && onFiles(files)}
        />
        {running ? (
          <Inline gap="3" align="center" wrap>
            <Text size="sm" tone="muted">
              {load.progress?.label ?? 'Loading'}
            </Text>
            {load.progress && load.progress.total > 1 ? (
              <ProgressBar
                label="Loading progress"
                labelHidden
                value={load.progress.done}
                max={load.progress.total}
              />
            ) : null}
            <Button size="sm" variant="ghost" onClick={load.cancel}>
              Cancel
            </Button>
          </Inline>
        ) : null}
        {load.status === 'done' && load.result ? (
          <Notice tone={load.result.warnings.length ? 'warning' : 'success'}>
            {[...load.result.done, ...load.result.warnings].join('. ')}
          </Notice>
        ) : null}
        {load.error ? (
          <Notice tone="danger" title="Could not load the data">
            {load.error.message}
          </Notice>
        ) : null}
        <SchemaList
          tables={db.tables}
          onQuery={onQuery}
          onSample={() => onMenu('sample')}
        />
      </Stack>
    </Card>
  );
}
