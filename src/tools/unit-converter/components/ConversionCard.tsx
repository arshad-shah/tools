import React from 'react';
import { IconArrowRightLeft } from '@/shared/ui/icons';

import {
  Badge,
  Card,
  CardBody,
  Center,
  Grid,
  Heading,
  IconButton,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import type { Category, Unit } from '../types';
import { formatNumber } from '../lib/convert';

interface ConversionCardProps {
  category: Category;
  fromUnit: Unit;
  toUnit: Unit;
  fromValue: string;
  toValue: string;
  onFromUnitChange: (u: Unit) => void;
  onToUnitChange: (u: Unit) => void;
  onFromValueChange: (v: string) => void;
  onCommit: () => void;
  onSwap: () => void;
}

/** From/To unit pickers, the value fields, swap, and the summary line. */
export const ConversionCard: React.FC<ConversionCardProps> = ({
  category,
  fromUnit,
  toUnit,
  fromValue,
  toValue,
  onFromUnitChange,
  onToUnitChange,
  onFromValueChange,
  onCommit,
  onSwap,
}) => {
  const unitItems = category.units.map((u) => ({
    value: u.name,
    label: `${u.name} (${u.symbol})`,
  }));

  return (
    <>
      <Card>
        <CardBody>
          <Grid max={2} gap="6" className="items-center">
            <Stack gap="3">
              <Inline align="center" gap="2">
                <Heading level={3} size="md">
                  From
                </Heading>
                <Badge variant="soft" tone="accent" size="xs">
                  INPUT
                </Badge>
              </Inline>
              <Stack gap="2">
                <Label>Unit</Label>
                <Select
                  value={fromUnit.name}
                  onValueChange={(v) => {
                    const u = category.units.find((x) => x.name === v);
                    if (u) onFromUnitChange(u);
                  }}
                  items={unitItems}
                  aria-label="From unit"
                />
              </Stack>
              <Stack gap="2">
                <Label htmlFor="from-value">Value</Label>
                <Input
                  id="from-value"
                  type="text"
                  value={fromValue}
                  onChange={onFromValueChange}
                  onBlur={onCommit}
                  placeholder="Enter value"
                  trailingSlot={
                    <Text size="sm" weight="medium">
                      {fromUnit.symbol}
                    </Text>
                  }
                  aria-label="From value"
                />
              </Stack>
            </Stack>

            <Stack gap="3">
              <Inline align="center" gap="2">
                <Heading level={3} size="md">
                  To
                </Heading>
                <Badge variant="soft" tone="success" size="xs">
                  RESULT
                </Badge>
              </Inline>
              <Stack gap="2">
                <Label>Unit</Label>
                <Select
                  value={toUnit.name}
                  onValueChange={(v) => {
                    const u = category.units.find((x) => x.name === v);
                    if (u) onToUnitChange(u);
                  }}
                  items={unitItems}
                  aria-label="To unit"
                />
              </Stack>
              <Stack gap="2">
                <Label htmlFor="to-value">Result</Label>
                <Input
                  id="to-value"
                  type="text"
                  value={formatNumber(toValue)}
                  readOnly
                  placeholder="Result"
                  trailingSlot={
                    <Text size="sm" weight="medium">
                      {toUnit.symbol}
                    </Text>
                  }
                  aria-label="Result value"
                />
              </Stack>
            </Stack>
          </Grid>

          <Inline justify="center" className="py-4">
            <IconButton
              variant="primary"
              className="rounded-full"
              label="Swap units"
              icon={<IconArrowRightLeft size="lg" />}
              onClick={onSwap}
            />
          </Inline>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Center>
            <Inline gap="3" align="center" wrap justify="center">
              <Badge variant="soft" tone="neutral" size="md">
                {fromValue ? formatNumber(fromValue) : '0'} {fromUnit.symbol}
              </Badge>
              <Text size="lg" weight="bold">
                =
              </Text>
              <Badge variant="solid" tone="accent" size="md">
                {toValue ? formatNumber(toValue) : '0'} {toUnit.symbol}
              </Badge>
            </Inline>
          </Center>
        </CardBody>
      </Card>
    </>
  );
};
