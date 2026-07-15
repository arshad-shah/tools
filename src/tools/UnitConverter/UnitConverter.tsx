import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Battery,
  Clock,
  Droplet,
  Gauge,
  HardDrive,
  History,
  RefreshCw,
  Ruler,
  Scale,
  Square,
  Thermometer,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Center,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Grid,
  Heading,
  IconButton,
  Inline,
  Input,
  Label,
  SearchInput,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';
import { Category, Conversion, Unit } from '../../types/UnitConverterTypes';

const CATEGORIES: Category[] = [
  {
    name: 'Length',
    icon: <Ruler size={18} aria-hidden />,
    baseUnit: 'meters',
    units: [
      { name: 'Kilometers', symbol: 'km', factor: 1000 },
      { name: 'Meters', symbol: 'm', factor: 1 },
      { name: 'Centimeters', symbol: 'cm', factor: 0.01 },
      { name: 'Millimeters', symbol: 'mm', factor: 0.001 },
      { name: 'Miles', symbol: 'mi', factor: 1609.34 },
      { name: 'Yards', symbol: 'yd', factor: 0.9144 },
      { name: 'Feet', symbol: 'ft', factor: 0.3048 },
      { name: 'Inches', symbol: 'in', factor: 0.0254 },
    ],
  },
  {
    name: 'Weight',
    icon: <Scale size={18} aria-hidden />,
    baseUnit: 'grams',
    units: [
      { name: 'Tonnes', symbol: 't', factor: 1000000 },
      { name: 'Kilograms', symbol: 'kg', factor: 1000 },
      { name: 'Grams', symbol: 'g', factor: 1 },
      { name: 'Milligrams', symbol: 'mg', factor: 0.001 },
      { name: 'Pounds', symbol: 'lb', factor: 453.592 },
      { name: 'Ounces', symbol: 'oz', factor: 28.3495 },
    ],
  },
  {
    name: 'Volume',
    icon: <Droplet size={18} aria-hidden />,
    baseUnit: 'liters',
    units: [
      { name: 'Cubic Meters', symbol: 'm³', factor: 1000 },
      { name: 'Liters', symbol: 'L', factor: 1 },
      { name: 'Milliliters', symbol: 'mL', factor: 0.001 },
      { name: 'Gallons (US)', symbol: 'gal', factor: 3.78541 },
      { name: 'Quarts', symbol: 'qt', factor: 0.946353 },
      { name: 'Pints', symbol: 'pt', factor: 0.473176 },
      { name: 'Cups', symbol: 'cup', factor: 0.236588 },
      { name: 'Fluid Ounces', symbol: 'fl oz', factor: 0.0295735 },
    ],
  },
  {
    name: 'Temperature',
    icon: <Thermometer size={18} aria-hidden />,
    baseUnit: 'kelvin',
    units: [
      { name: 'Kelvin', symbol: 'K', factor: 1 },
      { name: 'Celsius', symbol: '°C', factor: 1, offset: 273.15 },
      { name: 'Fahrenheit', symbol: '°F', factor: 5 / 9, offset: 459.67 },
    ],
  },
  {
    name: 'Area',
    icon: <Square size={18} aria-hidden />,
    baseUnit: 'square meters',
    units: [
      { name: 'Square Kilometers', symbol: 'km²', factor: 1000000 },
      { name: 'Hectares', symbol: 'ha', factor: 10000 },
      { name: 'Square Meters', symbol: 'm²', factor: 1 },
      { name: 'Square Miles', symbol: 'mi²', factor: 2589988.11 },
      { name: 'Acres', symbol: 'ac', factor: 4046.86 },
      { name: 'Square Feet', symbol: 'ft²', factor: 0.092903 },
      { name: 'Square Inches', symbol: 'in²', factor: 0.00064516 },
    ],
  },
  {
    name: 'Speed',
    icon: <Zap size={18} aria-hidden />,
    baseUnit: 'meters per second',
    units: [
      { name: 'Meters per Second', symbol: 'm/s', factor: 1 },
      { name: 'Kilometers per Hour', symbol: 'km/h', factor: 0.277778 },
      { name: 'Miles per Hour', symbol: 'mph', factor: 0.44704 },
      { name: 'Knots', symbol: 'kn', factor: 0.514444 },
      { name: 'Feet per Second', symbol: 'ft/s', factor: 0.3048 },
    ],
  },
  {
    name: 'Time',
    icon: <Timer size={18} aria-hidden />,
    baseUnit: 'seconds',
    units: [
      { name: 'Years', symbol: 'yr', factor: 31536000 },
      { name: 'Months', symbol: 'mo', factor: 2628000 },
      { name: 'Weeks', symbol: 'wk', factor: 604800 },
      { name: 'Days', symbol: 'd', factor: 86400 },
      { name: 'Hours', symbol: 'h', factor: 3600 },
      { name: 'Minutes', symbol: 'min', factor: 60 },
      { name: 'Seconds', symbol: 's', factor: 1 },
      { name: 'Milliseconds', symbol: 'ms', factor: 0.001 },
    ],
  },
  {
    name: 'Data',
    icon: <HardDrive size={18} aria-hidden />,
    baseUnit: 'bytes',
    units: [
      { name: 'Terabytes', symbol: 'TB', factor: 1099511627776 },
      { name: 'Gigabytes', symbol: 'GB', factor: 1073741824 },
      { name: 'Megabytes', symbol: 'MB', factor: 1048576 },
      { name: 'Kilobytes', symbol: 'KB', factor: 1024 },
      { name: 'Bytes', symbol: 'B', factor: 1 },
      { name: 'Bits', symbol: 'bit', factor: 0.125 },
    ],
  },
  {
    name: 'Pressure',
    icon: <Gauge size={18} aria-hidden />,
    baseUnit: 'pascals',
    units: [
      { name: 'Gigapascals', symbol: 'GPa', factor: 1000000000 },
      { name: 'Megapascals', symbol: 'MPa', factor: 1000000 },
      { name: 'Kilopascals', symbol: 'kPa', factor: 1000 },
      { name: 'Pascals', symbol: 'Pa', factor: 1 },
      { name: 'Bars', symbol: 'bar', factor: 100000 },
      { name: 'Atmospheres', symbol: 'atm', factor: 101325 },
      { name: 'Pounds per Square Inch', symbol: 'psi', factor: 6894.76 },
    ],
  },
  {
    name: 'Energy',
    icon: <Battery size={18} aria-hidden />,
    baseUnit: 'joules',
    units: [
      { name: 'Kilojoules', symbol: 'kJ', factor: 1000 },
      { name: 'Joules', symbol: 'J', factor: 1 },
      { name: 'Calories', symbol: 'cal', factor: 4.184 },
      { name: 'Kilocalories', symbol: 'kcal', factor: 4184 },
      { name: 'Watt-hours', symbol: 'Wh', factor: 3600 },
      { name: 'Kilowatt-hours', symbol: 'kWh', factor: 3600000 },
      { name: 'Electron-volts', symbol: 'eV', factor: 1.602177e-19 },
      { name: 'British Thermal Units', symbol: 'BTU', factor: 1055.06 },
    ],
  },
];

const formatNumber = (value: string): string => {
  if (!value || isNaN(parseFloat(value))) return value;
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const convertUnits = (
  value: string,
  from: Unit,
  to: Unit,
  category: Category,
): string => {
  if (value === '' || isNaN(parseFloat(value))) return '';
  const v = parseFloat(value);
  if (category.name === 'Temperature') {
    let kelvin: number;
    if (from.name === 'Celsius') kelvin = v + 273.15;
    else if (from.name === 'Fahrenheit') kelvin = (v + 459.67) * (5 / 9);
    else kelvin = v;
    let result: number;
    if (to.name === 'Celsius') result = kelvin - 273.15;
    else if (to.name === 'Fahrenheit') result = kelvin * (9 / 5) - 459.67;
    else result = kelvin;
    return parseFloat(result.toFixed(10)).toString();
  }
  const baseValue = v * from.factor;
  return parseFloat((baseValue / to.factor).toFixed(10)).toString();
};

const getTimeSince = (timestamp: Date): string => {
  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const UnitConverter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    CATEGORIES[0],
  );
  const [fromUnit, setFromUnit] = useState<Unit>(CATEGORIES[0].units[0]);
  const [toUnit, setToUnit] = useState<Unit>(CATEGORIES[0].units[1]);
  const [fromValue, setFromValue] = useState('1');
  const [toValue, setToValue] = useState('');
  const [history, setHistory] = useState<Conversion[]>([]);
  const [activeTab, setActiveTab] = useState<'converter' | 'saved'>(
    'converter',
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setFromUnit(selectedCategory.units[0]);
    setToUnit(selectedCategory.units[1]);
  }, [selectedCategory]);

  useEffect(() => {
    setToValue(convertUnits(fromValue, fromUnit, toUnit, selectedCategory));
  }, [fromValue, fromUnit, toUnit, selectedCategory]);

  const filteredCategories = useMemo(
    () =>
      CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  const addToHistory = () => {
    if (!fromValue || !toValue) return;
    setHistory((prev) => [
      {
        id: Date.now(),
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

  const unitItems = selectedCategory.units.map((u) => ({
    value: u.name,
    label: `${u.name} (${u.symbol})`,
  }));

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
                <Zap size={16} aria-hidden />
                <span>Converter</span>
              </Inline>
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Inline gap="2" align="center" wrap={false}>
                <History size={16} aria-hidden />
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
                      onClick={() => setSelectedCategory(c)}
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
                            const u = selectedCategory.units.find(
                              (x) => x.name === v,
                            );
                            if (u) setFromUnit(u);
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
                          onChange={setFromValue}
                          onBlur={addToHistory}
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
                            const u = selectedCategory.units.find(
                              (x) => x.name === v,
                            );
                            if (u) setToUnit(u);
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
                      variant="solid"
                      className="rounded-full"
                      label="Swap units"
                      icon={<ArrowRightLeft size={20} />}
                      onClick={swapUnits}
                    />
                  </Inline>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Center>
                    <Inline gap="3" align="center" wrap justify="center">
                      <Badge variant="soft" tone="neutral" size="md">
                        {fromValue ? formatNumber(fromValue) : '0'}{' '}
                        {fromUnit.symbol}
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
            </Stack>
          </TabsContent>

          <TabsContent value="saved">
            <Stack gap="4" className="pt-4">
              {history.length > 0 ? (
                <>
                  <Inline justify="between" align="center" wrap>
                    <Heading level={2} size="md">
                      <Inline gap="2" align="center">
                        <Clock size={20} aria-hidden />
                        Conversion history
                      </Inline>
                    </Heading>
                    <Button
                      variant="soft"
                      size="sm"
                      leftIcon={<X size={16} />}
                      onClick={() => setHistory([])}
                    >
                      Clear all
                    </Button>
                  </Inline>
                  <Stack gap="2">
                    {history.map((c) => (
                      <Card
                        key={c.id}
                        interactive
                        onClick={() => reuseConversion(c)}
                      >
                        <CardBody>
                          <Inline justify="between" align="center" gap="3" wrap>
                            <Inline align="center" gap="3">
                              {c.categoryIcon}
                              <Stack gap="1">
                                <Inline gap="2" align="center" wrap>
                                  <Text size="sm" weight="medium">
                                    {c.category}
                                  </Text>
                                  <Badge
                                    variant="soft"
                                    tone="neutral"
                                    size="xs"
                                  >
                                    {getTimeSince(c.timestamp)}
                                  </Badge>
                                </Inline>
                                <Inline gap="2" align="center" wrap>
                                  <Text size="sm" weight="semibold">
                                    {c.from}
                                  </Text>
                                  <Text size="sm" tone="subtle">
                                    →
                                  </Text>
                                  <Badge variant="soft" tone="accent" size="sm">
                                    {c.to}
                                  </Badge>
                                </Inline>
                              </Stack>
                            </Inline>
                            <Inline gap="1">
                              <IconButton
                                variant="ghost"
                                size="sm"
                                label="Reuse conversion"
                                icon={<RefreshCw size={16} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reuseConversion(c);
                                }}
                              />
                              <IconButton
                                variant="ghost"
                                size="sm"
                                tone="danger"
                                label="Remove conversion"
                                icon={<X size={16} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistory((prev) =>
                                    prev.filter((x) => x.id !== c.id),
                                  );
                                }}
                              />
                            </Inline>
                          </Inline>
                        </CardBody>
                      </Card>
                    ))}
                  </Stack>
                </>
              ) : (
                <EmptyState>
                  <EmptyStateIcon>
                    <History size={48} aria-hidden />
                  </EmptyStateIcon>
                  <EmptyStateTitle>No conversion history yet</EmptyStateTitle>
                  <EmptyStateDescription>
                    Your recent conversions will appear here.
                  </EmptyStateDescription>
                  <EmptyStateActions>
                    <Button
                      variant="solid"
                      onClick={() => setActiveTab('converter')}
                    >
                      Start converting
                    </Button>
                  </EmptyStateActions>
                </EmptyState>
              )}
            </Stack>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default UnitConverter;
