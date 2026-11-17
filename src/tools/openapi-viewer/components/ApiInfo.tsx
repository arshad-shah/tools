import {
  Badge,
  Card,
  Grid,
  Inline,
  List,
  Notice,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import type { Api } from '../lib/api';
import { isRelativeServer } from '../lib/request';

interface Props {
  api: Api;
  server: number;
  onServer(index: number): void;
  origin: string;
  onOrigin(origin: string): void;
}

/** The API's title, version, description and the server requests go to. */
export function ApiInfo({ api, server, onServer, origin, onOrigin }: Props) {
  const current = api.servers[server];
  return (
    <Card
      as="section"
      title={api.title}
      actions={
        <Inline gap="2" wrap>
          {api.version ? (
            <Badge size="sm" tone="accent">
              {`Version ${api.version}`}
            </Badge>
          ) : null}
          <Badge size="sm" tone="neutral">
            {api.kind === 'swagger2'
              ? 'Swagger 2.0'
              : `OpenAPI ${api.specVersion}`}
          </Badge>
        </Inline>
      }
    >
      <Stack gap="4">
        {api.description ? (
          <Text wrap="pre" truncate={6}>
            {api.description}
          </Text>
        ) : null}
        <Grid columns={{ base: 1, md: 2 }} gap="4" align="end">
          {api.servers.length ? (
            <Select
              label="Server"
              value={String(server)}
              onChange={(v) => onServer(Number(v))}
              options={api.servers.map((s, i) => ({
                value: String(i),
                label: s.description ? `${s.url} (${s.description})` : s.url,
              }))}
            />
          ) : (
            <Text size="sm" tone="muted">
              The document lists no servers.
            </Text>
          )}
          {isRelativeServer(current) ? (
            <TextField
              label="Base URL"
              description="The server is relative: requests go under this origin, or {{host}} when empty."
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://api.example.com"
              value={origin}
              onChange={onOrigin}
            />
          ) : null}
        </Grid>
        {api.problems.length ? (
          <Notice
            tone="warning"
            title="Parts of the document could not be read"
          >
            <List
              gap="sm"
              items={[
                ...api.problems
                  .slice(0, 20)
                  .map((p, i) => ({ id: `${i}`, label: p })),
                ...(api.problems.length > 20
                  ? [
                      {
                        id: 'more',
                        label: `And ${api.problems.length - 20} more`,
                      },
                    ]
                  : []),
              ]}
            />
          </Notice>
        ) : null}
      </Stack>
    </Card>
  );
}
