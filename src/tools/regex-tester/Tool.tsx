import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Inline,
  Input,
  Label,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import {
  IconAlertCircle,
  IconBarChart3,
  IconBookOpen,
  IconCheck,
  IconChevronDown,
  IconCodeXml,
  IconCopy,
  IconInfo,
  IconPlayCircle,
  IconSettings,
  IconX,
  IconZap,
} from '@/shared/ui/icons';
import { compile, type Match } from './lib/match';
import { toJsSnippet, toRegexLiteral } from './lib/code';
import { createRegexRunner, type RegexRunner } from './lib/runner';

const MATCH_DEBOUNCE_MS = 150;

/** One worker-backed runner per mounted tool, disposed on unmount. */
function useRegexRunner(): RegexRunner {
  const [runner] = useState(() =>
    createRegexRunner(
      () =>
        new Worker(new URL('./lib/regex.worker.ts', import.meta.url), {
          type: 'module',
        }),
    ),
  );
  useEffect(() => () => runner.dispose(), [runner]);
  return runner;
}

interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: 'web' | 'validation' | 'format' | 'common';
}

interface Flags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
  sticky: boolean;
  hasIndices: boolean;
}

const TEMPLATES: RegexTemplate[] = [
  {
    name: 'Email Address',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    description: 'Standard email address format',
    category: 'web',
  },
  {
    name: 'HTTP/HTTPS URL',
    pattern:
      'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    description: 'Web URLs with HTTP or HTTPS protocol',
    category: 'web',
  },
  {
    name: 'IPv4 Address',
    pattern:
      '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
    description: 'IPv4 network address',
    category: 'web',
  },
  {
    name: 'Strong Password',
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    description: 'Mixed case, numbers, and special chars (8+)',
    category: 'validation',
  },
  {
    name: 'Credit Card Number',
    pattern:
      '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$',
    description: 'Major credit card number formats',
    category: 'validation',
  },
  {
    name: 'Phone Number (E.164)',
    pattern: '\\+?[1-9]\\d{1,14}',
    description: 'International phone number format',
    category: 'common',
  },
  {
    name: 'Date (ISO 8601)',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    description: 'ISO date format (YYYY-MM-DD)',
    category: 'format',
  },
  {
    name: 'Time (24-hour)',
    pattern: '([01]?[0-9]|2[0-3]):[0-5][0-9]',
    description: '24-hour time format (HH:MM)',
    category: 'format',
  },
  {
    name: 'Hex Color Code',
    pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})',
    description: 'Hexadecimal color codes',
    category: 'format',
  },
  {
    name: 'UUID',
    pattern:
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    description: 'Universally Unique Identifier',
    category: 'format',
  },
];

/** Live-preview classes (formerly a CSS module). */
const PREVIEW = {
  preview:
    'relative grid max-h-[420px] grid-cols-[auto_1fr] overflow-auto rounded-lg border border-line bg-surface font-mono text-sm leading-[1.7] text-fg shadow-[inset_3px_0_0_0_var(--color-accent)]',
  gutter:
    'sticky left-0 select-none border-r border-line bg-surface-subtle py-3 pr-3 pl-[18px] text-right text-fg-subtle tabular-nums',
  gutterLine: 'block text-[0.85em] opacity-70',
  content:
    'min-w-0 px-4 py-3 whitespace-pre-wrap [word-break:break-word] [overflow-wrap:anywhere]',
  mark: 'rounded-[3px] bg-warning px-[3px] py-px text-canvas box-decoration-clone',
} as const;

const CATEGORY_LABEL: Record<RegexTemplate['category'], string> = {
  web: 'Web & URLs',
  validation: 'Validation',
  format: 'Formats',
  common: 'Common Patterns',
};

const FLAG_INFO: Array<{
  key: keyof Flags;
  flag: string;
  label: string;
  description: string;
}> = [
  {
    key: 'global',
    flag: 'g',
    label: 'Global',
    description: 'Find all matches',
  },
  {
    key: 'ignoreCase',
    flag: 'i',
    label: 'Ignore case',
    description: 'Case insensitive matching',
  },
  {
    key: 'multiline',
    flag: 'm',
    label: 'Multiline',
    description: '^ and $ match line breaks',
  },
  {
    key: 'dotAll',
    flag: 's',
    label: 'Dot all',
    description: '. matches newline characters',
  },
  {
    key: 'unicode',
    flag: 'u',
    label: 'Unicode',
    description: 'Full Unicode matching',
  },
  {
    key: 'sticky',
    flag: 'y',
    label: 'Sticky',
    description: 'Match only from lastIndex position',
  },
  {
    key: 'hasIndices',
    flag: 'd',
    label: 'Indices',
    description: 'Generate start/end indices',
  },
];

const MatchItem: React.FC<{
  match: Match;
  index: number;
  onCopy: () => void;
}> = ({ match, index, onCopy }) => {
  const [expanded, setExpanded] = useState(false);
  const hasGroups =
    (match.groups?.length ?? 0) > 0 ||
    Object.keys(match.namedGroups ?? {}).length > 0;

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline gap="2" align="center">
            <Badge variant="solid" tone="accent" size="sm">
              #{index + 1}
            </Badge>
            <Badge variant="soft" tone="neutral" size="sm">
              {match.index}–{match.index + match.length}
            </Badge>
            {match.length === 0 && (
              <Badge variant="soft" tone="warning" size="sm">
                Empty
              </Badge>
            )}
          </Inline>
          <Inline gap="1">
            <IconButton
              variant="ghost"
              size="sm"
              label="Copy match"
              icon={<IconCopy size="sm" />}
              onClick={onCopy}
            />
            {hasGroups && (
              <IconButton
                variant="ghost"
                size="sm"
                label={expanded ? 'Hide details' : 'Show details'}
                icon={expanded ? <IconX size="sm" /> : <IconInfo size="sm" />}
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          <Code block>{match.text || '(empty match)'}</Code>
          {expanded && hasGroups && (
            <Stack gap="2">
              {match.groups && match.groups.length > 0 && (
                <Stack gap="1">
                  <Text size="xs" weight="semibold">
                    Capture groups
                  </Text>
                  {match.groups.map((g, i) => (
                    <Inline key={i} justify="between" align="center">
                      <Text size="xs" tone="subtle">
                        Group {i + 1}:
                      </Text>
                      <Code>{g || '(empty)'}</Code>
                    </Inline>
                  ))}
                </Stack>
              )}
              {match.namedGroups &&
                Object.keys(match.namedGroups).length > 0 && (
                  <Stack gap="1">
                    <Text size="xs" weight="semibold">
                      Named groups
                    </Text>
                    {Object.entries(match.namedGroups).map(([n, v]) => (
                      <Inline key={n} justify="between" align="center">
                        <Text size="xs" tone="subtle">
                          {n}:
                        </Text>
                        <Code>{v || '(empty)'}</Code>
                      </Inline>
                    ))}
                  </Stack>
                )}
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const RegexStudio: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [flags, setFlags] = useState<Flags>({
    global: true,
    ignoreCase: false,
    multiline: false,
    dotAll: false,
    unicode: false,
    sticky: false,
    hasIndices: false,
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { copied, copy } = useClipboard();

  const flagsStr = useMemo(
    () =>
      FLAG_INFO.filter((f) => flags[f.key])
        .map((f) => f.flag)
        .join(''),
    [flags],
  );

  // Syntax is checked here (cheap, never runs the pattern); matching runs
  // in a worker with a timeout so a pathological pattern cannot freeze the
  // tab.
  const syntaxError = useMemo(() => {
    if (!pattern) return '';
    try {
      compile(pattern, flagsStr);
      return '';
    } catch (e) {
      return toToolError(e).message;
    }
  }, [pattern, flagsStr]);
  const isValid = !syntaxError;

  const runner = useRegexRunner();
  const inputKey = JSON.stringify([pattern, flagsStr, testString]);
  const [result, setResult] = useState<{
    key: string;
    matches: Match[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!pattern || !testString || syntaxError) return;
    let live = true;
    const timer = setTimeout(() => {
      runner.match(pattern, flagsStr, testString).then(
        (found) => live && setResult({ key: inputKey, matches: found }),
        (e: unknown) => {
          const err = toToolError(e);
          // Superseded by a newer input: that call reports instead.
          if (!live || err.code === 'CANCELLED') return;
          setResult({ key: inputKey, matches: [], error: err.message });
        },
      );
    }, MATCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [runner, inputKey, pattern, flagsStr, testString, syntaxError]);

  const current =
    pattern && testString && isValid && result?.key === inputKey
      ? result
      : null;
  const matches = useMemo(() => current?.matches ?? [], [current]);
  const runError = current?.error ?? '';
  const matching = !!pattern && !!testString && isValid && !current;
  const errorMessage = syntaxError;

  const copyToClipboard = useCallback(
    (text: string) => void copy(text),
    [copy],
  );

  const copyPattern = useCallback(() => {
    copyToClipboard(toRegexLiteral(pattern, flagsStr));
  }, [pattern, flagsStr, copyToClipboard]);

  const handleTemplateSelect = (value: string) => {
    const t = TEMPLATES.find((x) => x.name === value);
    if (!t) return;
    setPattern(t.pattern);
    setSelectedTemplate(t.name);
  };

  const renderHighlighted = () => {
    if (!testString) return null;
    if (matches.length === 0) return testString;
    const out: React.ReactNode[] = [];
    let last = 0;
    matches.forEach((m, i) => {
      if (m.index > last) {
        out.push(
          <span key={`t-${i}`}>{testString.substring(last, m.index)}</span>,
        );
      }
      out.push(
        <mark
          key={`m-${i}`}
          title={`Match #${i + 1}: "${m.text}"`}
          className={PREVIEW.mark}
        >
          {testString.substring(m.index, m.index + m.length)}
        </mark>,
      );
      last = m.index + m.length;
    });
    if (last < testString.length) {
      out.push(<span key="t-end">{testString.substring(last)}</span>);
    }
    return out;
  };

  const coverage = useMemo(() => {
    if (!testString || matches.length === 0) return 0;
    const total = matches.reduce((s, m) => s + m.length, 0);
    return Math.round((total / testString.length) * 100);
  }, [testString, matches]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<RegexTemplate['category'], RegexTemplate[]> = {
      web: [],
      validation: [],
      format: [],
      common: [],
    };
    TEMPLATES.forEach((t) => groups[t.category].push(t));
    return groups;
  }, []);

  const generateSample = () => {
    const lower = selectedTemplate.toLowerCase();
    if (lower.includes('email')) {
      setTestString(
        'Contact us at info@example.com or support@company.org\nJohn Doe: john.doe123@gmail.com\nInvalid: not-an-email@',
      );
    } else if (lower.includes('url') || lower.includes('http')) {
      setTestString(
        'Visit https://www.example.com or http://test.org\nAlso check https://sub.domain.co.uk/path?param=value\nInvalid: not-a-url',
      );
    } else if (lower.includes('phone')) {
      setTestString('+1234567890\n+44123456789\n555-0123\nInvalid: abc123');
    } else if (lower.includes('date')) {
      setTestString(
        'Meeting: 2023-05-15\nDeadline: 2024-01-31\nInvalid: 2023/05/15',
      );
    } else if (lower.includes('time')) {
      setTestString('Meeting at 09:30\nLunch break: 12:45\nInvalid: 25:61');
    } else if (lower.includes('ipv4')) {
      setTestString('192.168.1.1\n10.0.0.1\n203.0.113.42\nInvalid: 256.1.1.1');
    } else if (lower.includes('password')) {
      setTestString('Weak: password123\nStrong: P@ssw0rd!2023\nVery weak: 123');
    } else if (lower.includes('hex')) {
      setTestString('#FF5733\n#abc\n#123456\nInvalid: #zz5533');
    } else {
      setTestString(
        'Lorem ipsum dolor sit amet.\nNumbers: 123, 456\nEmail: user@example.com\nPhone: +1234567890\nDate: 2023-05-15\nURL: https://example.com',
      );
    }
  };

  const handleClearAll = () => {
    setPattern('');
    setTestString('');
    setSelectedTemplate('');
  };

  const handleCopyAsJs = () => {
    const code = toJsSnippet(pattern, flagsStr, testString);
    copyToClipboard(code);
  };

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Inline justify="between" align="center" gap="3" wrap>
            <Inline align="center" gap="3" wrap>
              <div className="relative min-w-[220px]">
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  aria-label="Template"
                  className="h-8 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-fg transition-colors focus:border-accent focus:outline-none"
                >
                  <option value="">Load a template…</option>
                  {(
                    Object.entries(groupedTemplates) as Array<
                      [RegexTemplate['category'], RegexTemplate[]]
                    >
                  ).map(([cat, list]) => (
                    <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                      {list.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <IconChevronDown
                  size="sm"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                />
              </div>

              <div className="h-6 w-px shrink-0 bg-line" aria-hidden />

              <Inline align="center" gap="2" wrap>
                <Badge
                  variant="soft"
                  tone={isValid ? 'success' : 'danger'}
                  size="sm"
                >
                  {isValid ? 'Valid' : 'Invalid'}
                </Badge>
                <Badge variant="soft" tone="neutral" size="sm">
                  {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                </Badge>
                {matches.length > 0 && (
                  <Badge variant="soft" tone="accent" size="sm">
                    {coverage}% coverage
                  </Badge>
                )}
                <Badge variant="outline" tone="neutral" size="sm" mono>
                  /{flagsStr || '—'}
                </Badge>
              </Inline>
            </Inline>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="soft"
                  size="sm"
                  rightIcon={<IconChevronDown size="sm" />}
                  leftIcon={<IconSettings size="sm" />}
                >
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyAsJs}
                  disabled={!pattern || !isValid}
                >
                  <Inline align="center" gap="2">
                    <IconCodeXml size="sm" />
                    <span>Copy as JavaScript</span>
                  </Inline>
                </DropdownMenuItem>
                {selectedTemplate && (
                  <DropdownMenuItem onClick={generateSample}>
                    <Inline align="center" gap="2">
                      <IconZap size="sm" />
                      <span>Generate sample text</span>
                    </Inline>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearAll}>
                  <Inline align="center" gap="2">
                    <IconX size="sm" />
                    <span>Clear all</span>
                  </Inline>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Inline>

          {selectedTemplate && (
            <Box className="pt-3">
              <Text size="xs" tone="subtle">
                {
                  TEMPLATES.find((t) => t.name === selectedTemplate)
                    ?.description
                }
              </Text>
            </Box>
          )}
        </CardBody>
      </Card>

      <Stack gap="4" className="min-w-0">
        <Card>
          <CardHeader>
            <Inline gap="2" align="center">
              <IconCodeXml size="lg" />
              <CardTitle as="h2">Regular expression</CardTitle>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="4">
              <Stack gap="2">
                <Label htmlFor="regex-pattern">Pattern</Label>
                <Inline gap="2" align="center" className="w-full">
                  <Box className="w-full min-w-0 flex-1">
                    <Input
                      id="regex-pattern"
                      type="text"
                      value={pattern}
                      onChange={setPattern}
                      placeholder="Enter your regex pattern…"
                      invalid={!isValid}
                      aria-label="Regex pattern"
                      leadingSlot={
                        <Text size="md" weight="semibold">
                          /
                        </Text>
                      }
                      trailingSlot={
                        <Text size="md" weight="semibold">
                          /{flagsStr}
                        </Text>
                      }
                    />
                  </Box>
                  <IconButton
                    variant="soft"
                    className={
                      copied ? 'border-success/40 text-success' : undefined
                    }
                    label="Copy regex with flags"
                    disabled={!pattern || !isValid}
                    icon={
                      copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />
                    }
                    onClick={copyPattern}
                  />
                </Inline>
                {!isValid && errorMessage && (
                  <Alert status="danger">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                {runError && (
                  <Alert status="danger" icon={<IconAlertCircle />}>
                    <AlertDescription>{runError}</AlertDescription>
                  </Alert>
                )}
              </Stack>

              <Stack gap="2">
                <Inline gap="2" align="center">
                  <IconSettings size="sm" />
                  <Label>Flags</Label>
                </Inline>
                <Inline gap="2" wrap>
                  {FLAG_INFO.map((f) => (
                    <Button
                      key={f.key}
                      variant={flags[f.key] ? 'solid' : 'soft'}
                      size="sm"
                      title={`${f.label}: ${f.description}`}
                      onClick={() =>
                        setFlags((prev) => ({ ...prev, [f.key]: !prev[f.key] }))
                      }
                    >
                      {f.flag}
                    </Button>
                  ))}
                </Inline>
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Inline justify="between" align="center" wrap gap="2">
              <Inline gap="2" align="center">
                <IconBookOpen size="lg" />
                <CardTitle as="h2">Test string</CardTitle>
              </Inline>
              {selectedTemplate && !testString && (
                <Button
                  variant="soft"
                  size="sm"
                  leftIcon={<IconZap size="sm" />}
                  onClick={generateSample}
                >
                  Generate sample
                </Button>
              )}
            </Inline>
          </CardHeader>
          <CardBody>
            <Textarea
              value={testString}
              onChange={setTestString}
              placeholder="Enter text to test against your regex…"
              rows={8}
              aria-label="Test string"
            />
          </CardBody>
        </Card>

        {pattern && testString && (
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap gap="2">
                <Inline gap="2" align="center">
                  <IconPlayCircle size="lg" />
                  <CardTitle as="h2">Live preview</CardTitle>
                </Inline>
                <Inline gap="2">
                  <Badge variant="solid" tone="accent" size="sm">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </Badge>
                  {matches.length > 0 && (
                    <Badge variant="soft" tone="neutral" size="sm">
                      {coverage}% coverage
                    </Badge>
                  )}
                </Inline>
              </Inline>
            </CardHeader>
            <CardBody>
              <div className={PREVIEW.preview}>
                <div className={PREVIEW.gutter} aria-hidden>
                  {Array.from({ length: testString.split('\n').length }).map(
                    (_, i) => (
                      <span key={i} className={PREVIEW.gutterLine}>
                        {i + 1}
                      </span>
                    ),
                  )}
                </div>
                <div className={PREVIEW.content}>{renderHighlighted()}</div>
              </div>
              {matching && (
                <Text size="sm" tone="subtle" className="pt-3">
                  Running the pattern
                </Text>
              )}
              {matches.length === 0 && current && !runError && (
                <Inline className="pt-3">
                  <Alert status="warning" icon={<IconAlertCircle />}>
                    <AlertDescription>
                      No matches found — try adjusting your pattern or test
                      string.
                    </AlertDescription>
                  </Alert>
                </Inline>
              )}
            </CardBody>
          </Card>
        )}
      </Stack>

      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <Inline gap="2" align="center">
              <IconBarChart3 size="md" />
              <CardTitle as="h2">Matches ({matches.length})</CardTitle>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="2">
              {matches.slice(0, 100).map((m, i) => (
                <MatchItem
                  key={i}
                  match={m}
                  index={i}
                  onCopy={() => copyToClipboard(m.text)}
                />
              ))}
              {matches.length > 100 && (
                <Alert status="info">
                  <AlertDescription>
                    Showing first 100 of {matches.length} matches. Consider
                    refining your pattern for better performance.
                  </AlertDescription>
                </Alert>
              )}
            </Stack>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
};

export default RegexStudio;
