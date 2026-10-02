import React from 'react';
import {
  IconCalculator,
  IconClock,
  IconHistory,
  IconRotateCcw,
  IconStar,
} from '@/shared/ui/icons';

import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  IconButton,
  Inline,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { useCalculator } from './hooks/useCalculator';
import { formatDisplay } from './lib/display';
import { ScientificKeypad, StandardKeypad } from './components/Keypad';
import { ExpressionPanel } from './components/ExpressionPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { FavoritesPanel, HistoryPanel } from './components/HistoryPanel';

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
    toggleHistory,
    showHistory,
    toggleFavorites,
    showFavorites,
    toggleMemoryPanel,
    showMemoryPanel,
    toggleTimestamps,
    showTimestamp,
    calculationHistory,
    memories,
    setDisplay,
  } = calc;

  const handleUseResult = (value: string) => setDisplay(value);

  const hasMemory = memories.some((m) => m.value !== null);

  // Shown on its own in Standard mode and under the scientific keys.
  const standardKeypad = (
    <StandardKeypad
      clear={calc.clear}
      clearEntry={calc.clearEntry}
      backspace={calc.backspace}
      performOperation={calc.performOperation}
      inputDigit={calc.inputDigit}
      toggleSign={calc.toggleSign}
      inputDecimal={calc.inputDecimal}
      calculate={calc.calculate}
      percentage={calc.percentage}
      squareRoot={calc.squareRoot}
      square={calc.square}
      reciprocal={calc.reciprocal}
    />
  );

  return (
    <Container size="md">
      <Stack gap="4">
        <Card>
          <CardHeader>
            <Inline justify="between" align="center" wrap gap="2">
              <Inline align="center" gap="2">
                <IconCalculator size="lg" />
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
                  variant={showMemoryPanel ? 'primary' : 'secondary'}
                  size="sm"
                  label="Memory"
                  icon={<IconRotateCcw size="sm" />}
                  onClick={toggleMemoryPanel}
                />
                <IconButton
                  variant={showHistory ? 'primary' : 'secondary'}
                  size="sm"
                  label="History"
                  icon={<IconHistory size="sm" />}
                  onClick={toggleHistory}
                />
                <IconButton
                  variant={showFavorites ? 'primary' : 'secondary'}
                  size="sm"
                  label="Saved calculations"
                  icon={<IconStar size="sm" />}
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

              {mode !== 'standard' && (
                <Inline justify="between" align="center" gap="2" wrap>
                  <ButtonGroup>
                    <Button
                      variant={angleUnit === 'deg' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setAngleUnit('deg')}
                    >
                      DEG
                    </Button>
                    <Button
                      variant={angleUnit === 'rad' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setAngleUnit('rad')}
                    >
                      RAD
                    </Button>
                  </ButtonGroup>
                  <IconButton
                    variant={showTimestamp ? 'primary' : 'secondary'}
                    size="sm"
                    label="Toggle timestamps"
                    icon={<IconClock size="sm" />}
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

              {mode === 'standard' && standardKeypad}
              {mode === 'scientific' && (
                <Stack gap="3">
                  <ScientificKeypad
                    factorial={calc.factorial}
                    performOperation={calc.performOperation}
                    sin={calc.sin}
                    cos={calc.cos}
                    tan={calc.tan}
                    asin={calc.asin}
                    acos={calc.acos}
                    atan={calc.atan}
                    sinh={calc.sinh}
                    cosh={calc.cosh}
                    tanh={calc.tanh}
                  />
                  {standardKeypad}
                </Stack>
              )}
              {mode === 'expression' && (
                <ExpressionPanel
                  display={display}
                  setDisplay={setDisplay}
                  angleUnit={angleUnit}
                  evaluateExpression={calc.evaluateExpression}
                  saveCalculation={calc.saveCalculation}
                  showGraph={calc.showGraph}
                  toggleGraph={calc.toggleGraph}
                  clear={calc.clear}
                  backspace={calc.backspace}
                />
              )}
            </Stack>
          </CardBody>
        </Card>

        {showMemoryPanel && (
          <MemoryPanel
            memories={memories}
            memoryClearAll={calc.memoryClearAll}
            memoryRecall={calc.memoryRecall}
            memoryAdd={calc.memoryAdd}
            memorySubtract={calc.memorySubtract}
            memoryClear={calc.memoryClear}
          />
        )}

        {showHistory && (
          <HistoryPanel
            calculationHistory={calculationHistory}
            setCalculationHistory={calc.setCalculationHistory}
            showTimestamp={showTimestamp}
            onUseResult={handleUseResult}
          />
        )}

        {showFavorites && (
          <FavoritesPanel
            savedCalculations={calc.savedCalculations}
            setSavedCalculations={calc.setSavedCalculations}
            onUseResult={handleUseResult}
          />
        )}
      </Stack>
    </Container>
  );
};

export default Calculator;
