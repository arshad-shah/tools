import React, { useMemo, useState } from 'react';
import { IconHistory, IconZap } from '@/shared/ui/icons';

import {
  Badge,
  Card,
  CardBody,
  Grid,
  Heading,
  Inline,
  SearchInput,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { newId } from '@/shared/lib/id';
import { Category, Conversion, Unit } from './types';
import { CATEGORIES } from './lib/categories';
import { convertUnits } from './lib/convert';
import { ConversionCard } from './components/ConversionCard';
import { HistoryList } from './components/HistoryList';

const UnitConverter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    CATEGORIES[0],
  );
  const [fromUnit, setFromUnit] = useState<Unit>(CATEGORIES[0].units[0]);
  const [toUnit, setToUnit] = useState<Unit>(CATEGORIES[0].units[1]);
  const [fromValue, setFromValue] = useState('1');
  const [history, setHistory] = useState<Conversion[]>([]);
  const [activeTab, setActiveTab] = useState<'converter' | 'saved'>(
    'converter',
  );
  const [searchTerm, setSearchTerm] = useState('');

  const toValue = useMemo(
    () => convertUnits(fromValue, fromUnit, toUnit, selectedCategory),
    [fromValue, fromUnit, toUnit, selectedCategory],
  );

  const filteredCategories = useMemo(
    () =>
      CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  /** Picking a different category resets the units to its first two. */
  const selectCategory = (c: Category) => {
    if (c === selectedCategory) return;
    setSelectedCategory(c);
    setFromUnit(c.units[0]);
    setToUnit(c.units[1]);
  };

  const addToHistory = () => {
    if (!fromValue || !toValue) return;
    setHistory((prev) => [
      {
        id: newId(),
        category: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        from: `${fromValue} ${fromUnit.symbol}`,
        to: `${toValue} ${toUnit.symbol}`,
        fromUnit,
        toUnit,
        fromValue,
        timestamp: new Date(),
      },
      ...prev.slice(0, 4),
    ]);
  };

  const swapUnits = () => {
    const tmp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tmp);
    setFromValue(toValue);
  };

  const reuseConversion = (c: Conversion) => {
    const cat = CATEGORIES.find((x) => x.name === c.category);
    if (!cat) return;
    setSelectedCategory(cat);
    setFromUnit(c.fromUnit);
    setToUnit(c.toUnit);
    setFromValue(c.fromValue);
    setActiveTab('converter');
  };

  return (
    <Card>
      <CardBody>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'converter' | 'saved')}
          variant="line"
        >
          <TabsList aria-label="Unit converter view">
            <TabsTrigger value="converter">
              <Inline gap="2" align="center" wrap={false}>
                <IconZap size="sm" />
                <span>Converter</span>
              </Inline>
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Inline gap="2" align="center" wrap={false}>
                <IconHistory size="sm" />
                <span>History</span>
                {history.length > 0 && (
                  <Badge variant="solid" tone="accent" size="xs">
                    {history.length}
                  </Badge>
                )}
              </Inline>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="converter">
            <Stack gap="6" className="pt-4">
              <Stack gap="3">
                <Inline justify="between" align="center" wrap gap="3">
                  <Heading level={2} size="md">
                    Select category
                  </Heading>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search categories…"
                  />
                </Inline>
                <Grid cols={{ base: 2, sm: 3, md: 5 }} gap="3">
                  {filteredCategories.map((c) => (
                    <Card
                      key={c.name}
                      interactive
                      className={
                        selectedCategory.name === c.name
                          ? 'border-accent'
                          : undefined
                      }
                      onClick={() => selectCategory(c)}
                    >
                      <CardBody>
                        <Stack gap="2" align="center">
                          {c.icon}
                          <Text
                            size="sm"
                            weight="medium"
                            className="text-center"
                          >
                            {c.name}
                          </Text>
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              </Stack>

              <ConversionCard
                category={selectedCategory}
                fromUnit={fromUnit}
                toUnit={toUnit}
                fromValue={fromValue}
                toValue={toValue}
                onFromUnitChange={setFromUnit}
                onToUnitChange={setToUnit}
                onFromValueChange={setFromValue}
                onCommit={addToHistory}
                onSwap={swapUnits}
              />
            </Stack>
          </TabsContent>

          <TabsContent value="saved">
            <HistoryList
              history={history}
              onReuse={reuseConversion}
              onRemove={(id) =>
                setHistory((prev) => prev.filter((x) => x.id !== id))
              }
              onClear={() => setHistory([])}
              onStart={() => setActiveTab('converter')}
            />
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default UnitConverter;
