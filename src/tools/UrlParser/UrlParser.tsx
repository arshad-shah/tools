import React, { useEffect, useState } from 'react';
import { CheckCheck, Clipboard, Copy, ExternalLink } from 'lucide-react';
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
} from '@arshad-shah/cynosure-react';

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
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
        leadingSlot={<ExternalLink size={18} aria-hidden />}
        clearable
        aria-label="URL to parse"
      />
      <Inline justify="end">
        <Button
          variant="soft"
          colorScheme="neutral"
          size="sm"
          leftIcon={<Clipboard size={16} />}
          onClick={handlePaste}
        >
          Paste from clipboard
        </Button>
      </Inline>
    </Stack>
  );

  if (!parsed) {
    return (
      <Card variant="elevated" size="md">
        <CardBody>
          <Stack gap="6">
            {urlInput}
            <Alert status="danger" variant="soft">
              <AlertTitle>Invalid URL</AlertTitle>
              <AlertDescription>
                Please enter a valid URL including a protocol (e.g.{' '}
                <Code size="sm">https://example.com</Code>).
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
      <Card variant="filled" size="md">
        <CardBody>
          <Stack gap="2">
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <Stack key={f.label} gap="1">
                  <Badge
                    variant="soft"
                    colorScheme={f.color}
                    size="sm"
                    shape="pill"
                  >
                    {f.label}
                  </Badge>
                  <Code size="sm" variant="block">{f.value}</Code>
                </Stack>
              ))}
          </Stack>
        </CardBody>
      </Card>

      <Card variant="outlined" size="md">
        <CardHeader>
          <CardTitle as="h3">URL components</CardTitle>
        </CardHeader>
        <CardBody>
          <Grid columns={{ base: 1, md: 2 }} gap="3">
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <Card key={f.label} variant="filled" size="sm">
                  <CardBody>
                    <Stack gap="2">
                      <Inline justify="between" align="center" gap="2" wrap>
                        <Badge variant="soft" colorScheme={f.color} size="xs">
                          {f.label}
                        </Badge>
                        <IconButton
                          variant="ghost"
                          colorScheme="neutral"
                          size="sm"
                          label={`Copy ${f.label}`}
                          icon={
                            copiedKey === f.label ? (
                              <CheckCheck size={16} />
                            ) : (
                              <Copy size={16} />
                            )
                          }
                          onClick={() => handleCopy(f.value, f.label)}
                        />
                      </Inline>
                      <Code size="sm" variant="block">{f.value}</Code>
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
        <Card key={item.label} variant="outlined" size="sm">
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Text size="sm" weight="semibold">
                  {item.label}
                </Text>
                {item.value ? (
                  <Code size="sm" variant="block">{item.value}</Code>
                ) : (
                  <Text size="sm" variant="caption">
                    (empty)
                  </Text>
                )}
              </Stack>
              {item.value && (
                <Button
                  variant="soft"
                  colorScheme="accent"
                  size="sm"
                  shape="pill"
                  leftIcon={
                    copiedKey === `table-${item.label}` ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Copy size={14} />
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
          <Card key={`${key}-${index}`} variant="outlined" size="sm">
            <CardBody>
              <Inline justify="between" align="center" gap="3" wrap>
                <Stack gap="1">
                  <Text size="sm" weight="semibold">
                    {key}
                  </Text>
                  <Code size="sm" variant="block">{value}</Code>
                </Stack>
                <Button
                  variant="soft"
                  colorScheme="accent"
                  size="sm"
                  shape="pill"
                  leftIcon={
                    copiedKey === `param-${key}` ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Copy size={14} />
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
      <EmptyState size="md" variant="subtle">
        <EmptyStateTitle>No query parameters</EmptyStateTitle>
        <EmptyStateDescription>
          This URL doesn&apos;t contain any query parameters.
        </EmptyStateDescription>
      </EmptyState>
    );

  return (
    <Card variant="elevated" size="md">
      <CardBody>
        <Stack gap="6">
          {urlInput}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            variant="line"
            colorScheme="accent"
          >
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
