import React, { useMemo, useState } from 'react';
import {
  IconAward,
  IconCheck,
  IconCopy,
  IconHash,
  IconInfo,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Grid,
  Heading,
  Inline,
  Input,
  Label,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { convertNumber, NUMBER_TYPES, SAMPLE_NUMBERS } from './lib/convert';
import type { NumberKey } from './types';

const NumberConverter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('converter');
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<NumberKey>('decimal');
  const currentType = NUMBER_TYPES.find((t) => t.value === inputType)!;
  const { results, error } = useMemo(
    () => convertNumber(inputValue, currentType),
    [inputValue, currentType],
  );
  const { copiedKey, copy } = useClipboard();

  const handleCopy = (value: string, key: NumberKey) => {
    if (value) void copy(value, key);
  };

  return (
    <Card>
      <CardBody>
        <Tabs value={activeTab} onValueChange={setActiveTab} variant="line">
          <TabsList aria-label="Number converter view">
            <TabsTrigger value="converter">
              <Inline gap="2" align="center" wrap={false}>
                <IconHash size="sm" />
                <span>Converter</span>
              </Inline>
            </TabsTrigger>
            <TabsTrigger value="info">
              <Inline gap="2" align="center" wrap={false}>
                <IconInfo size="sm" />
                <span>Number systems</span>
              </Inline>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="converter">
            <Stack gap="6" className="pt-4">
              <Stack gap="4">
                <Heading level={2} size="md">
                  Input number
                </Heading>
                <Grid max={2} gap="4">
                  <Stack gap="2">
                    <Label>Select number type</Label>
                    <ButtonGroup>
                      {NUMBER_TYPES.map((t) => (
                        <Button
                          key={t.value}
                          variant={inputType === t.value ? 'solid' : 'soft'}
                          size="sm"
                          onClick={() => setInputType(t.value)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Stack>
                  <Stack gap="2">
                    <Label htmlFor="num-input">
                      Enter {currentType.label} number
                    </Label>
                    <Input
                      id="num-input"
                      type="text"
                      value={inputValue}
                      onChange={setInputValue}
                      placeholder={`Type your ${currentType.label.toLowerCase()} number…`}
                      invalid={!!error}
                      clearable
                    />
                    {error && (
                      <Alert status="danger">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </Stack>
                </Grid>
              </Stack>

              <Stack gap="3">
                <Heading level={2} size="md">
                  Conversion results
                </Heading>
                <Grid max={2} gap="3">
                  {NUMBER_TYPES.map((t) => {
                    const value = results[t.value];
                    const isCurrent = inputType === t.value;
                    return (
                      <Card
                        key={t.value}
                        className={isCurrent ? 'border-accent' : undefined}
                      >
                        <CardHeader>
                          <Inline justify="between" align="center" wrap>
                            <Inline align="center" gap="2">
                              <Text size="sm" weight="semibold">
                                {t.label}
                              </Text>
                              <Badge tone="neutral" variant="soft" size="xs">
                                Base {t.base}
                              </Badge>
                            </Inline>
                            {value && (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={
                                  copiedKey === t.value ? (
                                    <IconCheck size="sm" />
                                  ) : (
                                    <IconCopy size="sm" />
                                  )
                                }
                                onClick={() => handleCopy(value, t.value)}
                              >
                                {copiedKey === t.value ? 'Copied' : 'Copy'}
                              </Button>
                            )}
                          </Inline>
                        </CardHeader>
                        <CardBody>
                          <Code block>{value || '—'}</Code>
                          {t.value === 'binary' && value && (
                            <Inline className="pt-2">
                              <Badge tone="accent" variant="soft" size="xs">
                                {value.length} bits
                              </Badge>
                            </Inline>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </Grid>
              </Stack>

              {results.binary && !error && (
                <Stack gap="3">
                  <Heading level={2} size="md">
                    Binary visualisation
                  </Heading>
                  <Card>
                    <CardBody>
                      <Inline gap="2" wrap justify="center">
                        {results.binary.split('').map((bit, idx) => (
                          <Badge
                            key={idx}
                            variant={bit === '1' ? 'solid' : 'outline'}
                            tone={bit === '1' ? 'accent' : 'neutral'}
                            size="md"
                          >
                            {bit}
                          </Badge>
                        ))}
                      </Inline>
                      <Inline justify="center" className="pt-3">
                        <Text size="xs" tone="subtle">
                          Each square represents one bit
                        </Text>
                      </Inline>
                    </CardBody>
                  </Card>
                </Stack>
              )}
            </Stack>
          </TabsContent>

          <TabsContent value="info">
            <Stack gap="6" className="pt-4">
              <Stack gap="3">
                <Heading level={2} size="md">
                  Number systems overview
                </Heading>
                <Grid max={2} gap="3">
                  {NUMBER_TYPES.map((t) => (
                    <Card key={t.value}>
                      <CardHeader>
                        <CardTitle as="h3">
                          {t.label} (Base {t.base})
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <Stack gap="3">
                          <Text size="sm">{t.description}</Text>
                          <Inline gap="2" wrap>
                            {t.uses.map((u) => (
                              <Badge
                                key={u}
                                tone="accent"
                                variant="soft"
                                size="sm"
                                pill
                              >
                                {u}
                              </Badge>
                            ))}
                          </Inline>
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              </Stack>

              <Alert status="info" icon={<IconAward />}>
                <AlertDescription>
                  <Text as="span" weight="semibold">
                    Why multiple number systems?
                  </Text>{' '}
                  Different number systems evolved based on practical needs.
                  Binary is fundamental to computing because electronic circuits
                  have two states: on and off. Hexadecimal and octal developed
                  as more human-readable representations of binary data.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle as="h3">Common conversions</CardTitle>
                </CardHeader>
                <CardBody>
                  <Stack gap="2">
                    {SAMPLE_NUMBERS.map((num) => (
                      <Card key={num}>
                        <CardBody>
                          <Grid max={4} gap="2">
                            <Stack gap="1">
                              <Text size="xs" tone="subtle">
                                Decimal
                              </Text>
                              <Text size="sm" weight="medium">
                                {num}
                              </Text>
                            </Stack>
                            <Stack gap="1">
                              <Text size="xs" tone="subtle">
                                Binary
                              </Text>
                              <Code block>{num.toString(2)}</Code>
                            </Stack>
                            <Stack gap="1">
                              <Text size="xs" tone="subtle">
                                Octal
                              </Text>
                              <Code block>{num.toString(8)}</Code>
                            </Stack>
                            <Stack gap="1">
                              <Text size="xs" tone="subtle">
                                Hex
                              </Text>
                              <Code block>
                                {num.toString(16).toUpperCase()}
                              </Code>
                            </Stack>
                          </Grid>
                        </CardBody>
                      </Card>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default NumberConverter;
