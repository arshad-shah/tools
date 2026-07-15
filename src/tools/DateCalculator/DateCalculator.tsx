import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import {
  CalendarDateTime,
  type DateValue,
  getLocalTimeZone,
  now,
  parseDateTime,
  toCalendarDateTime,
} from '@internationalized/date';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';

type TimeUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years';
type Operation = 'add' | 'subtract';
type TabType = 'difference' | 'modify';

const TIME_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

const OPERATION_OPTIONS = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
];

interface ResultState {
  message: string;
  status: 'success' | 'danger';
}

const toJsDate = (value: DateValue | null): Date | null => {
  if (!value) return null;
  const dt = toCalendarDateTime(value as CalendarDateTime);
  return dt.toDate(getLocalTimeZone());
};

// UI-boundary conversions for the native <input type="datetime-local">
// (minute granularity). State stays a DateValue so all calculation logic
// below is unchanged.
const pad = (n: number): string => String(n).padStart(2, '0');

const toInputValue = (value: DateValue | null): string => {
  if (!value) return '';
  const dt = toCalendarDateTime(value as CalendarDateTime);
  return `${dt.year}-${pad(dt.month)}-${pad(dt.day)}T${pad(dt.hour)}:${pad(dt.minute)}`;
};

const fromInputValue = (str: string): DateValue | null =>
  str ? parseDateTime(str) : null;

const DateCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('difference');

  const [startDate, setStartDate] = useState<DateValue | null>(null);
  const [endDate, setEndDate] = useState<DateValue | null>(null);
  const [diffResult, setDiffResult] = useState<ResultState | null>(null);

  const [baseDate, setBaseDate] = useState<DateValue | null>(
    now(getLocalTimeZone()),
  );
  const [timeValue, setTimeValue] = useState<number>(0);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days');
  const [operation, setOperation] = useState<Operation>('add');
  const [modifyResult, setModifyResult] = useState<ResultState | null>(null);

  const calculateDifference = () => {
    const start = toJsDate(startDate);
    const end = toJsDate(endDate);
    if (!start || !end) {
      setDiffResult({ message: 'Please select both dates', status: 'danger' });
      return;
    }
    const diffMs = Math.abs(end.getTime() - start.getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    setDiffResult({
      message: `${years} years, ${months % 12} months, ${days % 30} days, ${hours} hours, ${minutes} minutes`,
      status: 'success',
    });
  };

  const modifyDate = () => {
    const date = toJsDate(baseDate);
    if (!date) {
      setModifyResult({
        message: 'Please provide a base date',
        status: 'danger',
      });
      return;
    }
    const value = Number(timeValue);
    if (Number.isNaN(value)) {
      setModifyResult({ message: 'Invalid time value', status: 'danger' });
      return;
    }
    const result = new Date(date);
    const multiplier = operation === 'add' ? 1 : -1;
    switch (timeUnit) {
      case 'minutes':
        result.setMinutes(date.getMinutes() + value * multiplier);
        break;
      case 'hours':
        result.setHours(date.getHours() + value * multiplier);
        break;
      case 'days':
        result.setDate(date.getDate() + value * multiplier);
        break;
      case 'months':
        result.setMonth(date.getMonth() + value * multiplier);
        break;
      case 'years':
        result.setFullYear(date.getFullYear() + value * multiplier);
        break;
    }
    setModifyResult({ message: result.toLocaleString(), status: 'success' });
  };

  return (
    <Card>
      <CardBody>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          variant="soft"
          fullWidth
        >
          <TabsList aria-label="Date calculator mode">
            <TabsTrigger value="difference">
              <Inline gap="2" align="center" wrap={false}>
                <Calendar size={16} aria-hidden />
                <span>Date Difference</span>
              </Inline>
            </TabsTrigger>
            <TabsTrigger value="modify">
              <Inline gap="2" align="center" wrap={false}>
                <Plus size={16} aria-hidden />
                <span>Add / Subtract Time</span>
              </Inline>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="difference">
            <Stack gap="4" className="pt-4">
              <Stack gap="2">
                <Label>Start date</Label>
                <Input
                  type="datetime-local"
                  value={toInputValue(startDate)}
                  onChange={(v) => setStartDate(fromInputValue(v))}
                  aria-label="Start date"
                />
              </Stack>
              <Stack gap="2">
                <Label>End date</Label>
                <Input
                  type="datetime-local"
                  value={toInputValue(endDate)}
                  onChange={(v) => setEndDate(fromInputValue(v))}
                  aria-label="End date"
                />
              </Stack>
              <Button
                variant="solid"
                className="w-full"
                onClick={calculateDifference}
              >
                Calculate difference
              </Button>
              {diffResult && (
                <Alert status={diffResult.status}>
                  <AlertDescription>
                    <Text weight="medium">{diffResult.message}</Text>
                  </AlertDescription>
                </Alert>
              )}
            </Stack>
          </TabsContent>

          <TabsContent value="modify">
            <Stack gap="4" className="pt-4">
              <Stack gap="2">
                <Label>Base date</Label>
                <Input
                  type="datetime-local"
                  value={toInputValue(baseDate)}
                  onChange={(v) => setBaseDate(fromInputValue(v))}
                  aria-label="Base date"
                />
              </Stack>
              <Grid max={3} gap="3">
                <Stack gap="2">
                  <Label htmlFor="mod-op">Operation</Label>
                  <Select
                    id="mod-op"
                    value={operation}
                    onValueChange={(v) => setOperation(v as Operation)}
                    items={OPERATION_OPTIONS}
                    aria-label="Operation"
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="mod-val">Value</Label>
                  <NumberInput
                    id="mod-val"
                    min={0}
                    value={timeValue}
                    onValueChange={setTimeValue}
                    aria-label="Value"
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="mod-unit">Unit</Label>
                  <Select
                    id="mod-unit"
                    value={timeUnit}
                    onValueChange={(v) => setTimeUnit(v as TimeUnit)}
                    items={TIME_UNIT_OPTIONS}
                    aria-label="Unit"
                  />
                </Stack>
              </Grid>
              <Button variant="solid" className="w-full" onClick={modifyDate}>
                Calculate new date
              </Button>
              {modifyResult && (
                <Alert status={modifyResult.status}>
                  <AlertDescription>
                    <Text weight="medium">{modifyResult.message}</Text>
                  </AlertDescription>
                </Alert>
              )}
            </Stack>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default DateCalculator;
