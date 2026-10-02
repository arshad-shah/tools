import { useState } from 'react';
import {
  Checkbox,
  Input,
  Label,
  NumberInput,
  SearchInput,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  SwitchField,
  Textarea,
  FontSample,
  RadioGroup,
  ChoiceGrid,
  FontPreview,
} from '@/shared/ui';
import { IconMonitor, IconMoon, IconSun } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

export function InputsSection() {
  const [text, setText] = useState('Quarterly report.pdf');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('Two lines\nof notes');
  const [fruit, setFruit] = useState('pear');
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [size, setSize] = useState('m');
  const [level, setLevel] = useState(40);
  const [count, setCount] = useState(3);
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('light');
  const [face, setFace] = useState<string | null>('caveat');
  return (
    <Section name="inputs" title="Inputs">
      <div className="grid gap-4 md:grid-cols-2">
        <Stack gap="2">
          <Label htmlFor="kit-input">File name</Label>
          <Input id="kit-input" value={text} onChange={setText} clearable />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-input-error">With an error</Label>
          <Input
            id="kit-input-error"
            value="not-an-email"
            onChange={() => {}}
            invalid
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-search">Search</Label>
          <SearchInput
            id="kit-search"
            value={query}
            onChange={setQuery}
            placeholder="grep tools"
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-select">Select</Label>
          <Select
            id="kit-select"
            value={fruit}
            onValueChange={setFruit}
            items={[
              { value: 'apple', label: 'Apple' },
              { value: 'pear', label: 'Pear' },
            ]}
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-textarea">Textarea</Label>
          <Textarea
            id="kit-textarea"
            value={notes}
            onChange={setNotes}
            rows={3}
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-input-compact">Compact (inline editor)</Label>
          <Input
            id="kit-input-compact"
            value={text}
            onChange={setText}
            size="sm"
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="kit-disabled">Disabled</Label>
          <Input
            id="kit-disabled"
            value="Read only"
            onChange={() => {}}
            disabled
          />
        </Stack>
      </div>
      <Row label="SwitchField">
        <SwitchField label="Padding" checked={on} onCheckedChange={setOn} />
        <SwitchField
          label="Wrap at 76"
          description="MIME line length"
          checked={false}
          onCheckedChange={() => {}}
        />
      </Row>
      <Row label="Switch, Checkbox, Slider, NumberInput">
        <Switch checked={on} onCheckedChange={setOn} aria-label="Autosave" />
        <Switch checked={false} onCheckedChange={() => {}} aria-label="Off" />
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
          aria-label="Agree"
        />
        <Checkbox
          checked={false}
          onCheckedChange={() => {}}
          aria-label="Not agreed"
        />
        <div className="w-48">
          <Slider
            value={level}
            onValueChange={setLevel}
            aria-label="Level"
            aria-valuetext={`${level} percent`}
          />
        </div>
        <NumberInput
          value={count}
          onValueChange={setCount}
          aria-label="Copies"
        />
      </Row>
      <Row label="SegmentedControl">
        <SegmentedControl<'system' | 'light' | 'dark'>
          label="Theme preview"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: 'System', icon: IconMonitor },
            { value: 'light', label: 'Light', icon: IconSun },
            { value: 'dark', label: 'Dark', icon: IconMoon },
          ]}
        />
        <SegmentedControl
          label="Size"
          size="sm"
          value="a4"
          onChange={() => {}}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'Letter' },
            { value: 'legal', label: 'Legal', disabled: true },
          ]}
        />
      </Row>
      <Row label="RadioGroup, FontSample">
        <RadioGroup
          label="Size"
          value={size}
          onValueChange={setSize}
          options={[
            { value: 's', label: 'Small' },
            { value: 'm', label: 'Medium' },
            { value: 'l', label: 'Large' },
          ]}
        />
        <FontSample
          family="Sign Caveat"
          color="#1e3a8a"
          className="rounded-md border border-line bg-white px-3 py-2 text-2xl"
        >
          Ada Lovelace
        </FontSample>
      </Row>
      <Row label="ChoiceGrid, FontPreview">
        <ChoiceGrid
          label="Font"
          value={face}
          onChange={setFace}
          columns={3}
          className="w-full max-w-lg"
          options={[
            {
              value: 'caveat',
              label: 'Caveat',
              slant: 0,
              text: 'Ada Lovelace',
            },
            {
              value: 'slanted',
              label: 'Slanted',
              slant: 12,
              text: 'Ada Lovelace',
            },
            { value: 'empty', label: 'Placeholder', slant: 0, text: '' },
          ].map((o) => ({
            value: o.value,
            label: o.label,
            render: () => (
              <FontPreview
                label={o.label}
                family="Sign Caveat"
                text={o.text}
                slant={o.slant}
                color="#1e3a8a"
                size={22}
                className="h-12"
              />
            ),
          }))}
        />
      </Row>
    </Section>
  );
}
