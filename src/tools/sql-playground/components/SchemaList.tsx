import {
  Badge,
  Button,
  Disclosure,
  EmptyState,
  Inline,
  ListRow,
  ListRows,
  Stack,
} from '@arshad-shah/cynosure';
import { database, play, sparkles } from '@arshad-shah/cynosure/icons';
import type { SchemaTable } from '../lib/engine';
import { plural } from '../lib/results';

interface SchemaListProps {
  tables: SchemaTable[];
  /** Puts a query of the table in the editor and runs it. */
  onQuery(table: SchemaTable): void;
  /** Loads the sample tables (the empty state's one action). */
  onSample(): void;
}

/** The tables and views of the database, each with its columns. */
export function SchemaList({ tables, onQuery, onSample }: SchemaListProps) {
  if (tables.length === 0)
    return (
      <EmptyState
        size="sm"
        icon={database}
        title="No tables yet"
        description="Load a file above, or create tables with SQL."
        headingLevel={3}
        actions={
          <Button size="sm" variant="soft" icon={sparkles} onClick={onSample}>
            Load sample tables
          </Button>
        }
      />
    );
  return (
    <Stack gap="2" as="section" aria-label="Tables">
      {tables.map((t) => (
        <Disclosure
          key={t.name}
          variant="card"
          size="sm"
          headingLevel={3}
          summary={t.name}
          trailing={
            <Badge size="sm" variant="soft" tone="neutral">
              {t.kind === 'view' ? 'View' : plural(t.rowCount ?? 0, 'row')}
            </Badge>
          }
        >
          <Stack gap="2">
            <ListRows label={`Columns of ${t.name}`} size="sm" divided>
              {t.columns.map((c) => (
                <ListRow
                  key={c.name}
                  label={c.name}
                  trailing={
                    <Inline gap="1">
                      {c.primaryKey ? (
                        <Badge size="sm" tone="accent" variant="soft">
                          Key
                        </Badge>
                      ) : null}
                      {c.notNull ? (
                        <Badge size="sm" variant="outline">
                          Not null
                        </Badge>
                      ) : null}
                      <Badge size="sm" variant="outline">
                        {c.type || 'Any'}
                      </Badge>
                    </Inline>
                  }
                />
              ))}
            </ListRows>
            <Inline>
              <Button
                size="sm"
                variant="soft"
                icon={play}
                onClick={() => onQuery(t)}
              >
                {`Query ${t.name}`}
              </Button>
            </Inline>
          </Stack>
        </Disclosure>
      ))}
    </Stack>
  );
}
