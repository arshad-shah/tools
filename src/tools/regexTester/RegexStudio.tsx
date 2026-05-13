import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  Code2,
  Copy,
  Info,
  PlayCircle,
  Settings,
  X,
  Zap,
} from 'lucide-react';
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
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  Select,
  SelectItem,
  SelectSection,
  Stack,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';

interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: 'web' | 'validation' | 'format' | 'common';
}

interface Match {
  text: string;
  index: number;
  length: number;
  groups: string[] | null;
  namedGroups: Record<string, string> | null;
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
    pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    description: 'Universally Unique Identifier',
    category: 'format',
  },
];

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
  { key: 'global', flag: 'g', label: 'Global', description: 'Find all matches' },
  { key: 'ignoreCase', flag: 'i', label: 'Ignore case', description: 'Case insensitive matching' },
  { key: 'multiline', flag: 'm', label: 'Multiline', description: '^ and $ match line breaks' },
  { key: 'dotAll', flag: 's', label: 'Dot all', description: '. matches newline characters' },
  { key: 'unicode', flag: 'u', label: 'Unicode', description: 'Full Unicode matching' },
  { key: 'sticky', flag: 'y', label: 'Sticky', description: 'Match only from lastIndex position' },
  { key: 'hasIndices', flag: 'd', label: 'Indices', description: 'Generate start/end indices' },
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
    <Card variant="outlined" size="sm">
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline gap="2" align="center">
            <Badge variant="solid" colorScheme="accent" size="sm">
              #{index + 1}
            </Badge>
            <Badge variant="soft" colorScheme="neutral" size="sm">
              {match.index}–{match.index + match.length}
            </Badge>
            {match.length === 0 && (
              <Badge variant="soft" colorScheme="warning" size="sm">
                Empty
              </Badge>
            )}
          </Inline>
          <Inline gap="1">
            <IconButton
              variant="ghost"
              colorScheme="neutral"
              size="sm"
              label="Copy match"
              icon={<Copy size={14} />}
              onClick={onCopy}
            />
            {hasGroups && (
              <IconButton
                variant="ghost"
                colorScheme="neutral"
                size="sm"
                label={expanded ? 'Hide details' : 'Show details'}
                icon={expanded ? <X size={14} /> : <Info size={14} />}
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          <Code size="sm">
            {match.text || '(empty match)'}
          </Code>
          {expanded && hasGroups && (
            <Stack gap="2">
              {match.groups && match.groups.length > 0 && (
                <Stack gap="1">
                  <Text size="xs" weight="semibold">
                    Capture groups
                  </Text>
                  {match.groups.map((g, i) => (
                    <Inline key={i} justify="between" align="center">
                      <Text size="xs" variant="caption">
                        Group {i + 1}:
                      </Text>
                      <Code size="sm">{g || '(empty)'}</Code>
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
                        <Text size="xs" variant="caption">
                          {n}:
                        </Text>
                        <Code size="sm">{v || '(empty)'}</Code>
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
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
  const [copied, setCopied] = useState(false);

  const flagsStr = useMemo(
    () =>
      FLAG_INFO.filter((f) => flags[f.key]).map((f) => f.flag).join(''),
    [flags],
  );

  useEffect(() => {
    if (!pattern) {
      setMatches([]);
      setIsValid(true);
      setErrorMessage('');
      return;
    }
    try {
      const regex = new RegExp(pattern, flagsStr);
      setIsValid(true);
      setErrorMessage('');
      if (!testString) {
        setMatches([]);
        return;
      }
      const found: Match[] = [];
      if (flags.global) {
        let m: RegExpExecArray | null;
        regex.lastIndex = 0;
        while ((m = regex.exec(testString)) !== null) {
          const groups = m.slice(1);
          found.push({
            text: m[0],
            index: m.index,
            length: m[0].length,
            groups: groups.length > 0 ? groups : null,
            namedGroups: m.groups || null,
          });
          if (m.index === regex.lastIndex) regex.lastIndex++;
          if (found.length >= 1000) break;
        }
      } else {
        const m = regex.exec(testString);
        if (m) {
          const groups = m.slice(1);
          found.push({
            text: m[0],
            index: m.index,
            length: m[0].length,
            groups: groups.length > 0 ? groups : null,
            namedGroups: m.groups || null,
          });
        }
      }
      setMatches(found);
    } catch (err) {
      setIsValid(false);
      setMatches([]);
      setErrorMessage(err instanceof Error ? err.message : 'Invalid regex');
    }
  }, [pattern, testString, flags, flagsStr]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyPattern = useCallback(() => {
    copyToClipboard(`/${pattern}/${flagsStr}`);
  }, [pattern, flagsStr, copyToClipboard]);

  const handleTemplateSelect = (value: string) => {
    const t = TEMPLATES.find((x) => x.name === value);
    if (!t) return;
    setPattern(t.pattern);
    setSelectedTemplate(t.name);
  };

  const renderHighlighted = () => {
    if (!testString || matches.length === 0) return testString;
    const out: React.ReactNode[] = [];
    let last = 0;
    matches.forEach((m, i) => {
      if (m.index > last) {
        out.push(<span key={`t-${i}`}>{testString.substring(last, m.index)}</span>);
      }
      out.push(
        <Badge
          key={`m-${i}`}
          variant="soft"
          colorScheme="accent"
          size="sm"
          title={`Match #${i + 1}: "${m.text}"`}
        >
          {testString.substring(m.index, m.index + m.length)}
        </Badge>,
      );
      last = m.index + m.length;
    });
    if (last < testString.length) {
      out.push(<span key="t-last">{testString.substring(last)}</span>);
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
      setTestString('Meeting: 2023-05-15\nDeadline: 2024-01-31\nInvalid: 2023/05/15');
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

  return (
    <Grid columns={{ base: 1, lg: 3 }} gap="4">
      <Stack gap="4" gridColumn={{ base: 'span 1', lg: 'span 2' }}>
        <Card variant="elevated" size="md">
          <CardHeader>
            <Inline gap="2" align="center">
              <Code2 size={20} aria-hidden />
              <CardTitle as="h2">Regular expression</CardTitle>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="4">
              <Stack gap="2">
                <Label htmlFor="regex-pattern">Pattern</Label>
                <Inline gap="2" align="center" wrap={false}>
                  <Text size="lg" weight="semibold">/</Text>
                  <Box width="full">
                    <Input
                      id="regex-pattern"
                      type="text"
                      value={pattern}
                      onChange={setPattern}
                      placeholder="Enter your regex pattern…"
                      invalid={!isValid}
                      aria-label="Regex pattern"
                    />
                  </Box>
                  <Text size="lg" weight="semibold">/{flagsStr}</Text>
                  <IconButton
                    variant="soft"
                    colorScheme={copied ? 'success' : 'neutral'}
                    label="Copy regex with flags"
                    disabled={!pattern || !isValid}
                    icon={copied ? <Check size={16} /> : <Copy size={16} />}
                    onClick={copyPattern}
                  />
                </Inline>
                {!isValid && errorMessage && (
                  <Alert status="danger" variant="soft">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
              </Stack>

              <Stack gap="2">
                <Inline gap="2" align="center">
                  <Settings size={16} aria-hidden />
                  <Label>Flags</Label>
                </Inline>
                <Inline gap="2" wrap>
                  {FLAG_INFO.map((f) => (
                    <Button
                      key={f.key}
                      variant={flags[f.key] ? 'solid' : 'soft'}
                      colorScheme={flags[f.key] ? 'accent' : 'neutral'}
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

        <Card variant="elevated" size="md">
          <CardHeader>
            <Inline justify="between" align="center" wrap gap="2">
              <Inline gap="2" align="center">
                <BookOpen size={20} aria-hidden />
                <CardTitle as="h2">Test string</CardTitle>
              </Inline>
              {selectedTemplate && !testString && (
                <Button
                  variant="soft"
                  colorScheme="accent"
                  size="sm"
                  leftIcon={<Zap size={14} />}
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
          <Card variant="elevated" size="md">
            <CardHeader>
              <Inline justify="between" align="center" wrap gap="2">
                <Inline gap="2" align="center">
                  <PlayCircle size={20} aria-hidden />
                  <CardTitle as="h2">Live preview</CardTitle>
                </Inline>
                <Inline gap="2">
                  <Badge variant="solid" colorScheme="accent" size="sm">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </Badge>
                  {matches.length > 0 && (
                    <Badge variant="soft" colorScheme="neutral" size="sm">
                      {coverage}% coverage
                    </Badge>
                  )}
                </Inline>
              </Inline>
            </CardHeader>
            <CardBody>
              <Card variant="filled" size="sm">
                <CardBody>
                  <Inline gap="1" wrap>{renderHighlighted()}</Inline>
                </CardBody>
              </Card>
              {matches.length === 0 && pattern && isValid && (
                <Inline paddingTop="3">
                  <Alert
                    status="warning"
                    variant="soft"
                    icon={<AlertCircle aria-hidden />}
                  >
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

      <Stack gap="4">
        <Card variant="elevated" size="md">
          <CardHeader>
            <Inline gap="2" align="center">
              <BookOpen size={18} aria-hidden />
              <CardTitle as="h2">Templates</CardTitle>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="3">
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateSelect}
                placeholder="Select a template…"
                aria-label="Template"
              >
                {(
                  Object.entries(groupedTemplates) as Array<
                    [RegexTemplate['category'], RegexTemplate[]]
                  >
                ).map(([cat, list]) => (
                  <SelectSection key={cat} title={CATEGORY_LABEL[cat]}>
                    {list.map((t) => (
                      <SelectItem key={t.name} id={t.name} textValue={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectSection>
                ))}
              </Select>
              {selectedTemplate && (
                <Card variant="filled" size="sm">
                  <CardBody>
                    <Stack gap="2">
                      <Text size="sm" weight="medium">
                        {TEMPLATES.find((t) => t.name === selectedTemplate)
                          ?.description}
                      </Text>
                      <Code size="sm">
                        {
                          TEMPLATES.find((t) => t.name === selectedTemplate)
                            ?.pattern
                        }
                      </Code>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card variant="elevated" size="md">
          <CardHeader>
            <Inline gap="2" align="center">
              <BarChart3 size={18} aria-hidden />
              <CardTitle as="h2">Statistics</CardTitle>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" variant="caption">
                  Pattern status
                </Text>
                <Badge
                  variant="soft"
                  colorScheme={isValid ? 'success' : 'danger'}
                  size="sm"
                >
                  {isValid ? 'Valid' : 'Invalid'}
                </Badge>
              </Inline>
              <Inline justify="between" align="center">
                <Text size="sm" variant="caption">
                  Total matches
                </Text>
                <Badge variant="soft" colorScheme="neutral" size="sm">
                  {matches.length}
                </Badge>
              </Inline>
              <Inline justify="between" align="center">
                <Text size="sm" variant="caption">
                  Pattern length
                </Text>
                <Text size="sm" weight="medium">
                  {pattern.length} chars
                </Text>
              </Inline>
              <Inline justify="between" align="center">
                <Text size="sm" variant="caption">
                  Test string length
                </Text>
                <Text size="sm" weight="medium">
                  {testString.length} chars
                </Text>
              </Inline>
              <Inline justify="between" align="center">
                <Text size="sm" variant="caption">
                  Active flags
                </Text>
                <Code size="sm">{flagsStr || 'none'}</Code>
              </Inline>
              {matches.length > 0 && (
                <Inline justify="between" align="center">
                  <Text size="sm" variant="caption">
                    Coverage
                  </Text>
                  <Text size="sm" weight="medium">
                    {coverage}%
                  </Text>
                </Inline>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card variant="elevated" size="md">
          <CardHeader>
            <CardTitle as="h2">Quick actions</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack gap="2">
              <Button
                variant="soft"
                colorScheme="accent"
                leftIcon={<Code2 size={16} />}
                disabled={!pattern || !isValid}
                onClick={() => {
                  const code = `const regex = /${pattern}/${flagsStr};\nconst matches = '${testString.replace(/'/g, "\\'")}'.match(regex);`;
                  copyToClipboard(code);
                }}
                fullWidth
              >
                Copy as JavaScript
              </Button>
              <Button
                variant="soft"
                colorScheme="neutral"
                leftIcon={<X size={16} />}
                onClick={() => {
                  setPattern('');
                  setTestString('');
                  setSelectedTemplate('');
                }}
                fullWidth
              >
                Clear all
              </Button>
            </Stack>
          </CardBody>
        </Card>

        {matches.length > 0 && (
          <Card variant="elevated" size="md">
            <CardHeader>
              <CardTitle as="h2">Matches ({matches.length})</CardTitle>
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
                  <Alert status="info" variant="soft">
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
    </Grid>
  );
};

export default RegexStudio;
