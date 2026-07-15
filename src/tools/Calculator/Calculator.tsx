import React, { useMemo } from 'react';
import {
  ArrowLeft,
  BarChart4,
  Calculator as CalcIcon,
  Clock,
  Divide,
  Equal,
  History,
  Minus,
  Percent,
  Plus,
  Power,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  Heading,
  IconButton,
  Inline,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/components/ui';
import { useCalculator } from './hooks/useCalculator';
import PlotlyGraphDisplay from './GraphDisplay';

type KeyColorScheme = 'accent' | 'neutral' | 'danger' | 'success' | 'warning';
type KeyVariant = 'solid' | 'soft' | 'outline' | 'ghost';

interface CalcKeyProps {
  onClick?: () => void;
  variant?: KeyVariant;
  colorScheme?: KeyColorScheme;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const CalcKey: React.FC<CalcKeyProps> = ({
  onClick,
  variant = 'soft',
  colorScheme = 'neutral',
  icon,
  children,
}) => (
  <Button
    variant={colorScheme === 'danger' ? 'danger' : variant}
    size="lg"
    leftIcon={icon}
    onClick={onClick}
    className="w-full"
  >
    {children}
  </Button>
);

const Calculator: React.FC = () => {
  const calc = useCalculator();
  const {
    mode,
    setMode,
    angleUnit,
    setAngleUnit,
    display,
    pendingOperator,
    calculationValue,
    previousCalculation,
    formatDisplay,
    toggleHistory,
    toggleFavorites,
    showFavorites,
    toggleMemoryPanel,
    showMemoryPanel,
    toggleTimestamps,
    showTimestamp,
    calculationHistory,
    savedCalculations,
    memories,
    memoryClearAll,
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,

    inputDigit,
    inputDecimal,
    clear,
    clearEntry,
    backspace,
    toggleSign,
    percentage,
    performOperation,
    calculate,

    squareRoot,
    square,
    reciprocal,
    factorial,
    sin,
    cos,
    tan,
    asin,
    acos,
    atan,
    sinh,
    cosh,
    tanh,

    evaluateExpression,
    checkParenthesesBalance,
    saveCalculation,
    toggleGraph,
    showGraph,
    setDisplay,
    setCalculationHistory,
    setSavedCalculations,
  } = calc;

  const handleUseResult = (value: string) => setDisplay(value);

  const hasMemory = memories.some((m) => m.value !== null);
  const isBalanced = useMemo(
    () => checkParenthesesBalance(display),
    [display, checkParenthesesBalance],
  );

  const renderStandardKeypad = () => (
    <Box className="grid grid-cols-4 gap-2">
      <CalcKey variant="solid" colorScheme="danger" onClick={clear}>
        C
      </CalcKey>
      <CalcKey onClick={clearEntry}>CE</CalcKey>
      <CalcKey onClick={backspace} icon={<ArrowLeft size={16} />} />
      <CalcKey
        variant="solid"
        colorScheme="accent"
        onClick={() => performOperation('÷')}
        icon={<Divide size={16} />}
      />

      <CalcKey onClick={() => inputDigit(7)}>7</CalcKey>
      <CalcKey onClick={() => inputDigit(8)}>8</CalcKey>
      <CalcKey onClick={() => inputDigit(9)}>9</CalcKey>
      <CalcKey
        variant="solid"
        colorScheme="accent"
        onClick={() => performOperation('×')}
        icon={<X size={16} />}
      />

      <CalcKey onClick={() => inputDigit(4)}>4</CalcKey>
      <CalcKey onClick={() => inputDigit(5)}>5</CalcKey>
      <CalcKey onClick={() => inputDigit(6)}>6</CalcKey>
      <CalcKey
        variant="solid"
        colorScheme="accent"
        onClick={() => performOperation('-')}
        icon={<Minus size={16} />}
      />

      <CalcKey onClick={() => inputDigit(1)}>1</CalcKey>
      <CalcKey onClick={() => inputDigit(2)}>2</CalcKey>
      <CalcKey onClick={() => inputDigit(3)}>3</CalcKey>
      <CalcKey
        variant="solid"
        colorScheme="accent"
        onClick={() => performOperation('+')}
        icon={<Plus size={16} />}
      />

      <CalcKey onClick={toggleSign}>±</CalcKey>
      <CalcKey onClick={() => inputDigit(0)}>0</CalcKey>
      <CalcKey onClick={inputDecimal}>.</CalcKey>
      <CalcKey
        variant="solid"
        colorScheme="success"
        onClick={calculate}
        icon={<Equal size={16} />}
      />

      <CalcKey onClick={percentage} icon={<Percent size={16} />} />
      <CalcKey onClick={squareRoot}>√</CalcKey>
      <CalcKey onClick={square}>x²</CalcKey>
      <CalcKey onClick={reciprocal}>1/x</CalcKey>
    </Box>
  );

  const renderScientificExtras = () => (
    <Box className="grid grid-cols-4 gap-2">
      <CalcKey variant="soft" colorScheme="accent" onClick={factorial}>
        x!
      </CalcKey>
      <CalcKey
        variant="soft"
        colorScheme="accent"
        onClick={() => performOperation('pow')}
        icon={<Power size={16} />}
      />
      <CalcKey variant="soft" colorScheme="accent" onClick={sin}>
        sin
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={cos}>
        cos
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={tan}>
        tan
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={asin}>
        asin
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={acos}>
        acos
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={atan}>
        atan
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={sinh}>
        sinh
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={cosh}>
        cosh
      </CalcKey>
      <CalcKey variant="soft" colorScheme="accent" onClick={tanh}>
        tanh
      </CalcKey>
      <CalcKey
        variant="soft"
        colorScheme="accent"
        onClick={() => performOperation('mod')}
      >
        mod
      </CalcKey>
    </Box>
  );

  const renderExpressionMode = () => (
    <Stack gap="3">
      <Alert status="info">
        <AlertDescription>
          Use expressions like 2+3*4, sin(30), or x^2+1. Parentheses balanced:{' '}
          <Badge
            variant="soft"
            tone={isBalanced ? 'success' : 'danger'}
            size="xs"
          >
            {isBalanced ? 'Yes' : 'No'}
          </Badge>
        </AlertDescription>
      </Alert>

      <Inline gap="2" wrap>
        <Box className="flex-1">
          <Button
            variant="solid"
            onClick={evaluateExpression}
            leftIcon={<Equal size={16} />}
            className="w-full"
          >
            Evaluate
          </Button>
        </Box>
        <IconButton
          variant="soft"
          label="Save calculation"
          icon={<Star size={16} />}
          onClick={saveCalculation}
        />
        <IconButton
          variant={showGraph ? 'solid' : 'soft'}
          label="Plot expression"
          icon={<BarChart4 size={16} />}
          onClick={toggleGraph}
        />
      </Inline>

      {showGraph && (
        <Card>
          <CardBody>
            <PlotlyGraphDisplay expression={display} />
          </CardBody>
        </Card>
      )}

      <Textarea
        value={display}
        onChange={setDisplay}
        rows={4}
        placeholder="Enter mathematical expression (use 'x' for plotting)…"
        aria-label="Expression"
      />

      <Box className="grid grid-cols-4 gap-2">
        <CalcKey onClick={() => setDisplay(display + '(')}>(</CalcKey>
        <CalcKey onClick={() => setDisplay(display + ')')}>)</CalcKey>
        <CalcKey onClick={() => setDisplay(display + '^')}>^</CalcKey>
        <CalcKey variant="solid" colorScheme="danger" onClick={clear}>
          C
        </CalcKey>

        <CalcKey onClick={() => setDisplay(display + 'sin(')}>sin</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'cos(')}>cos</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'tan(')}>tan</CalcKey>
        <CalcKey onClick={backspace} icon={<ArrowLeft size={16} />} />

        <CalcKey onClick={() => setDisplay(display + 'sqrt(')}>sqrt</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'log(')}>log</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'ln(')}>ln</CalcKey>
        <CalcKey onClick={() => setDisplay(display + '!')}>!</CalcKey>

        <CalcKey onClick={() => setDisplay(display + 'x')}>x</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'pi')}>π</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'e')}>e</CalcKey>
        <CalcKey
          variant="solid"
          colorScheme="success"
          onClick={evaluateExpression}
          icon={<Equal size={16} />}
        />
      </Box>
    </Stack>
  );

  return (
    <Container size="md">
      <Stack gap="4">
        <Card>
          <CardHeader>
            <Inline justify="between" align="center" wrap gap="2">
              <Inline align="center" gap="2">
                <CalcIcon size={20} aria-hidden />
                <Heading level={2} size="lg">
                  ProCalc
                  {mode === 'scientific'
                    ? ' Pro'
                    : mode === 'expression'
                      ? ' Dev'
                      : ''}
                </Heading>
                {hasMemory && (
                  <Badge variant="solid" tone="accent" size="xs">
                    M
                  </Badge>
                )}
              </Inline>
              <Inline gap="1">
                <IconButton
                  variant={showMemoryPanel ? 'solid' : 'soft'}
                  size="sm"
                  label="Memory"
                  icon={<RotateCcw size={14} />}
                  onClick={toggleMemoryPanel}
                />
                <IconButton
                  variant="soft"
                  size="sm"
                  label="History"
                  icon={<History size={14} />}
                  onClick={toggleHistory}
                />
                <IconButton
                  variant={showFavorites ? 'solid' : 'soft'}
                  size="sm"
                  label="Saved calculations"
                  icon={<Star size={14} />}
                  onClick={toggleFavorites}
                />
              </Inline>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="4">
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as typeof mode)}
                variant="soft"
                fullWidth
              >
                <TabsList aria-label="Calculator mode">
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="scientific">Scientific</TabsTrigger>
                  <TabsTrigger value="expression">Expression</TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === 'scientific' && (
                <Inline justify="between" align="center" gap="2" wrap>
                  <ButtonGroup>
                    <Button
                      variant={angleUnit === 'deg' ? 'solid' : 'soft'}
                      size="sm"
                      onClick={() => setAngleUnit('deg')}
                    >
                      DEG
                    </Button>
                    <Button
                      variant={angleUnit === 'rad' ? 'solid' : 'soft'}
                      size="sm"
                      onClick={() => setAngleUnit('rad')}
                    >
                      RAD
                    </Button>
                  </ButtonGroup>
                  <IconButton
                    variant={showTimestamp ? 'solid' : 'soft'}
                    size="sm"
                    label="Toggle timestamps"
                    icon={<Clock size={14} />}
                    onClick={toggleTimestamps}
                  />
                </Inline>
              )}

              {mode !== 'expression' && (
                <Card>
                  <CardBody>
                    <Stack gap="1" align="end">
                      <Text size="xs" tone="subtle">
                        {pendingOperator
                          ? `${calculationValue} ${pendingOperator}`
                          : previousCalculation}
                      </Text>
                      <Heading
                        level={3}
                        size="3xl"
                        className="text-right tabular-nums break-all"
                      >
                        {formatDisplay(display)}
                      </Heading>
                    </Stack>
                  </CardBody>
                </Card>
              )}

              {mode === 'standard' && renderStandardKeypad()}
              {mode === 'scientific' && (
                <Stack gap="3">
                  {renderScientificExtras()}
                  {renderStandardKeypad()}
                </Stack>
              )}
              {mode === 'expression' && renderExpressionMode()}
            </Stack>
          </CardBody>
        </Card>

        {showMemoryPanel && (
          <Card>
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle as="h3">Memory registers</CardTitle>
                <Button variant="danger" size="sm" onClick={memoryClearAll}>
                  Clear all
                </Button>
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="2">
                {memories.map((mem, i) => (
                  <Card key={mem.label}>
                    <CardBody>
                      <Inline justify="between" align="center" gap="2" wrap>
                        <Text size="sm" weight="medium">
                          {mem.label}:{' '}
                          {mem.value === null ? '—' : String(mem.value)}
                        </Text>
                        <ButtonGroup>
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => memoryRecall(i)}
                          >
                            MR
                          </Button>
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => memoryAdd(i)}
                          >
                            M+
                          </Button>
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => memorySubtract(i)}
                          >
                            M-
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => memoryClear(i)}
                          >
                            MC
                          </Button>
                        </ButtonGroup>
                      </Inline>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            </CardBody>
          </Card>
        )}

        {calculationHistory.length > 0 && (
          <Card>
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle as="h3">History</CardTitle>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCalculationHistory([])}
                >
                  Clear
                </Button>
              </Inline>
            </CardHeader>
            <CardBody>
              <Box className="overflow-auto max-h-96">
                <Stack gap="2">
                  {calculationHistory.map((item, idx) => {
                    const text =
                      typeof item === 'string' ? item : item.calculation;
                    const timestamp =
                      typeof item === 'string' ? undefined : item.timestamp;
                    return (
                      <Card key={idx}>
                        <CardBody>
                          <Stack gap="1">
                            <Text size="sm">{text}</Text>
                            {showTimestamp && timestamp && (
                              <Text size="xs" tone="subtle">
                                {timestamp}
                              </Text>
                            )}
                            <Inline>
                              <Button
                                variant="soft"
                                size="sm"
                                onClick={() => {
                                  const parts = text.split(' = ');
                                  if (parts.length === 2)
                                    handleUseResult(parts[1]);
                                }}
                              >
                                Use result
                              </Button>
                            </Inline>
                          </Stack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            </CardBody>
          </Card>
        )}

        {showFavorites && (
          <Card>
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle as="h3">Saved calculations</CardTitle>
                {savedCalculations.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setSavedCalculations([])}
                  >
                    Clear all
                  </Button>
                )}
              </Inline>
            </CardHeader>
            <CardBody>
              {savedCalculations.length === 0 ? (
                <Text size="sm" tone="subtle" className="text-center">
                  No saved calculations yet
                </Text>
              ) : (
                <Box className="overflow-auto max-h-96">
                  <Stack gap="2">
                    {savedCalculations.map((item, idx) => (
                      <Card key={idx}>
                        <CardBody>
                          <Stack gap="1">
                            <Inline justify="between" align="start" gap="2">
                              <Stack gap="1">
                                <Text size="sm">{item.calculation}</Text>
                                {item.timestamp && (
                                  <Text size="xs" tone="subtle">
                                    {item.timestamp}
                                  </Text>
                                )}
                              </Stack>
                              <IconButton
                                variant="ghost"
                                size="sm"
                                label="Remove"
                                icon={<Trash2 size={14} />}
                                onClick={() => {
                                  const next = [...savedCalculations];
                                  next.splice(idx, 1);
                                  setSavedCalculations(next);
                                }}
                              />
                            </Inline>
                            <Inline>
                              <Button
                                variant="soft"
                                size="sm"
                                onClick={() => {
                                  const parts = item.calculation.split(' = ');
                                  if (parts.length === 2)
                                    handleUseResult(parts[1]);
                                }}
                              >
                                Use result
                              </Button>
                            </Inline>
                          </Stack>
                        </CardBody>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </CardBody>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default Calculator;
