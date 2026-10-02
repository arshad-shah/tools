import React from 'react';
import {
  IconArrowLeft,
  IconDivide,
  IconEqual,
  IconMinus,
  IconPercent,
  IconPlus,
  IconPower,
  IconX,
} from '@/shared/ui/icons';

import { Grid } from '@/shared/ui';
import type { CalculatorState } from '../hooks/useCalculator';
import { CalcKey } from './CalcKey';

type StandardKeypadProps = Pick<
  CalculatorState,
  | 'clear'
  | 'clearEntry'
  | 'backspace'
  | 'performOperation'
  | 'inputDigit'
  | 'toggleSign'
  | 'inputDecimal'
  | 'calculate'
  | 'percentage'
  | 'squareRoot'
  | 'square'
  | 'reciprocal'
>;

export const StandardKeypad: React.FC<StandardKeypadProps> = ({
  clear,
  clearEntry,
  backspace,
  performOperation,
  inputDigit,
  toggleSign,
  inputDecimal,
  calculate,
  percentage,
  squareRoot,
  square,
  reciprocal,
}) => (
  <Grid cols={4} gap="2">
    <CalcKey variant="solid" colorScheme="danger" onClick={clear}>
      C
    </CalcKey>
    <CalcKey onClick={clearEntry}>CE</CalcKey>
    <CalcKey onClick={backspace} icon={<IconArrowLeft size="sm" />} />
    <CalcKey
      variant="solid"
      colorScheme="accent"
      onClick={() => performOperation('÷')}
      icon={<IconDivide size="sm" />}
    />

    <CalcKey onClick={() => inputDigit(7)}>7</CalcKey>
    <CalcKey onClick={() => inputDigit(8)}>8</CalcKey>
    <CalcKey onClick={() => inputDigit(9)}>9</CalcKey>
    <CalcKey
      variant="solid"
      colorScheme="accent"
      onClick={() => performOperation('×')}
      icon={<IconX size="sm" />}
    />

    <CalcKey onClick={() => inputDigit(4)}>4</CalcKey>
    <CalcKey onClick={() => inputDigit(5)}>5</CalcKey>
    <CalcKey onClick={() => inputDigit(6)}>6</CalcKey>
    <CalcKey
      variant="solid"
      colorScheme="accent"
      onClick={() => performOperation('-')}
      icon={<IconMinus size="sm" />}
    />

    <CalcKey onClick={() => inputDigit(1)}>1</CalcKey>
    <CalcKey onClick={() => inputDigit(2)}>2</CalcKey>
    <CalcKey onClick={() => inputDigit(3)}>3</CalcKey>
    <CalcKey
      variant="solid"
      colorScheme="accent"
      onClick={() => performOperation('+')}
      icon={<IconPlus size="sm" />}
    />

    <CalcKey onClick={toggleSign}>±</CalcKey>
    <CalcKey onClick={() => inputDigit(0)}>0</CalcKey>
    <CalcKey onClick={inputDecimal}>.</CalcKey>
    <CalcKey
      variant="solid"
      colorScheme="success"
      onClick={calculate}
      icon={<IconEqual size="sm" />}
    />

    <CalcKey onClick={percentage} icon={<IconPercent size="sm" />} />
    <CalcKey onClick={squareRoot}>√</CalcKey>
    <CalcKey onClick={square}>x²</CalcKey>
    <CalcKey onClick={reciprocal}>1/x</CalcKey>
  </Grid>
);

type ScientificKeypadProps = Pick<
  CalculatorState,
  | 'factorial'
  | 'performOperation'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'sinh'
  | 'cosh'
  | 'tanh'
>;

export const ScientificKeypad: React.FC<ScientificKeypadProps> = ({
  factorial,
  performOperation,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  sinh,
  cosh,
  tanh,
}) => (
  <Grid cols={4} gap="2">
    <CalcKey variant="soft" colorScheme="accent" onClick={factorial}>
      x!
    </CalcKey>
    <CalcKey
      variant="soft"
      colorScheme="accent"
      onClick={() => performOperation('pow')}
      icon={<IconPower size="sm" />}
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
  </Grid>
);
