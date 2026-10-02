import React, { useEffect, useState } from 'react';
import {
  IconCheckCheck,
  IconClipboard,
  IconCopy,
  IconExternalLink,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
  Grid,
  IconButton,
  Inline,
  Input,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { readClipboardText, useClipboard } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';

interface ParsedUrl {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  host: string;
  searchParams: [string, string][];
}

type FieldColor =
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

const URLParser: React.FC = () => {
  const [url, setUrl] = useState(
    'https://user:pass@www.example.com:8080/path/to/page.html?query=string&foo=bar#hash',
  );
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [isValid, setIsValid] = useState(true);
  const { copiedKey, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState('visualization');

  useEffect(() => {
    try {
      const u = new URL(url);
      setParsed({
        protocol: u.protocol,
        username: u.username,
        password: u.password,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        search: u.search,
        hash: u.hash,
        origin: u.origin,
        host: u.host,
        searchParams: Array.from(u.searchParams.entries()),
      });
      setIsValid(true);
    } catch {
      setParsed(null);
      setIsValid(false);
    }
  }, [url]);

  const handleCopy = (text: string, key: string) => {
    if (text) void copy(text, key);
  };

  const handlePaste = async () => {
    try {
      setUrl(await readClipboardText());
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const urlInput = (
    <Stack gap="2">
      <Input
        type="url"
        value={url}
        onChange={setUrl}
        placeholder="Enter a URL to parse…"
        invalid={!isValid}
        leadingSlot={<IconExternalLink size="md" />}
        clearable
        aria-label="URL to parse"
      />
      <Inline justify="end">
        <Button
          variant="soft"
          size="sm"
          leftIcon={<IconClipboard size="sm" />}
          onClick={handlePaste}
        >
          Paste from clipboard
        </Button>
      </Inline>
    </Stack>
  );

  if (!parsed) {
    return (
      <Card>
        <CardBody>
          <Stack gap="6">
            {urlInput}
            <Alert status="danger">
              <AlertTitle>Invalid URL</AlertTitle>
              <AlertDescription>
                Please enter a valid URL including a protocol (e.g.{' '}
                <Code>https://example.com</Code>).
              </AlertDescription>
            </Alert>
          </Stack>
        </CardBody>
      </Card>
    );
  }

  const fields: { label: string; value: string; color: FieldColor }[] = [
    { label: 'Protocol', value: parsed.protocol, color: 'accent' },
    { label: 'Username', value: parsed.username, color: 'info' },
    { label: 'Password', value: parsed.password, color: 'info' },
    { label: 'Hostname', value: parsed.hostname, color: 'success' },
    { label: 'Port', value: parsed.port, color: 'danger' },
    { label: 'Path', value: parsed.pathname, color: 'accent' },
    { label: 'Query', value: parsed.search, color: 'warning' },
    { label: 'Fragment', value: parsed.hash, color: 'warning' },
  ];

  const allComponents = [
    { label: 'Full URL', value: url },
    { label: 'Origin', value: parsed.origin },
    { label: 'Protocol', value: parsed.protocol },
    { label: 'Username', value: parsed.username },
    { label: 'Password', value: parsed.password },
    { label: 'Host', value: parsed.host },
    { label: 'Hostname', value: parsed.hostname },
    { label: 'Port', value: parsed.port },
    { label: 'Pathname', value: parsed.pathname },
    { label: 'Search', value: parsed.search },
    { label: 'Hash', value: parsed.hash },
  ];

  const visualBreakdown = (
    <Stack gap="6">
      <Card>
        <CardBody>
          <Stack gap="2">
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <Stack key={f.label} gap="1">
                  <Badge variant="soft" tone={f.color} size="sm" pill>
                    {f.label}
                  </Badge>
                  <Code block>{f.value}</Code>
                </Stack>
              ))}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">URL components</CardTitle>
        </CardHeader>
        <CardBody>
          <Grid max={2} gap="3">
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <Card key={f.label} className="bg-surface-subtle">
                  <CardBody>
                    <Stack gap="2">
                      <Inline justify="between" align="center" gap="2" wrap>
                        <Badge variant="soft" tone={f.color} size="xs">
                          {f.label}
                        </Badge>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          label={`Copy ${f.label}`}
                          icon={
                            copiedKey === f.label ? (
                              <IconCheckCheck size="sm" />
                            ) : (
                              <IconCopy size="sm" />
                            )
                          }
                          onClick={() => handleCopy(f.value, f.label)}
                        />
                      </Inline>
                      <Code block>{f.value}</Code>
                    </Stack>
                  </CardBody>
                </Card>
              ))}
          </Grid>
        </CardBody>
      </Card>
    </Stack>
  );

  const componentsTable = (
    <Stack gap="2">
      {allComponents.map((item) => (
        <Card key={item.label}>
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Text size="sm" weight="semibold">
                  {item.label}
                </Text>
                {item.value ? (
                  <Code block>{item.value}</Code>
                ) : (
                  <Text size="sm" tone="subtle">
                    (empty)
                  </Text>
                )}
              </Stack>
              {item.value && (
                <Button
                  variant="soft"
                  size="sm"
                  leftIcon={
                    copiedKey === `table-${item.label}` ? (
                      <IconCheckCheck size="sm" />
                    ) : (
                      <IconCopy size="sm" />
                    )
                  }
                  onClick={() => handleCopy(item.value, `table-${item.label}`)}
                >
                  {copiedKey === `table-${item.label}` ? 'Copied' : 'Copy'}
                </Button>
              )}
            </Inline>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );

  const queryParams =
    parsed.searchParams.length > 0 ? (
      <Stack gap="2">
        {parsed.searchParams.map(([key, value], index) => (
          <Card key={`${key}-${index}`}>
            <CardBody>
              <Inline justify="between" align="center" gap="3" wrap>
                <Stack gap="1">
                  <Text size="sm" weight="semibold">
                    {key}
                  </Text>
                  <Code block>{value}</Code>
                </Stack>
                <Button
                  variant="soft"
                  size="sm"
                  leftIcon={
                    copiedKey === `param-${key}` ? (
                      <IconCheckCheck size="sm" />
                    ) : (
                      <IconCopy size="sm" />
                    )
                  }
                  onClick={() => handleCopy(value, `param-${key}`)}
                >
                  {copiedKey === `param-${key}` ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
            </CardBody>
          </Card>
        ))}
      </Stack>
    ) : (
      <EmptyState>
        <EmptyStateTitle>No query parameters</EmptyStateTitle>
        <EmptyStateDescription>
          This URL doesn&apos;t contain any query parameters.
        </EmptyStateDescription>
      </EmptyState>
    );

  return (
    <Card>
      <CardBody>
        <Stack gap="6">
          {urlInput}
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="line">
            <TabsList aria-label="URL view">
              <TabsTrigger value="visualization">Visual breakdown</TabsTrigger>
              <TabsTrigger value="components">URL components</TabsTrigger>
              <TabsTrigger value="queryParams">Query parameters</TabsTrigger>
            </TabsList>
            <TabsContent value="visualization">{visualBreakdown}</TabsContent>
            <TabsContent value="components">{componentsTable}</TabsContent>
            <TabsContent value="queryParams">{queryParams}</TabsContent>
          </Tabs>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default URLParser;
