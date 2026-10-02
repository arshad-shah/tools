import React, { useRef, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Label,
  NumberInput,
  Inline,
  SegmentedControl,
  Select,
  ShareButton,
  Stack,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { AllUnits } from './components/AllUnits';
import { FreeText } from './components/FreeText';
import { HistoryList } from './components/HistoryList';
import { useUnitConverter } from './hooks/useUnitConverter';
import { convert } from './lib/convert';
import { formatNumber } from './lib/format';
import { parseFreeText } from './lib/free-text';
import { CATEGORIES, findUnit, getCategory } from './lib/units';
import type { UnitSettings } from './settings';
import { parseUnitShare, UNIT_SHARE_VERSION, type UnitShare } from './share';

const UnitConverter: React.FC = () => {
  const s = useUnitConverter();
  const { settings, update, category } = s;
  const { copiedKey, copy } = useClipboard();
  const [free, setFree] = useState('');
  const [freeResult, setFreeResult] = useState<string | null>(null);
  const freeRef = useRef<HTMLInputElement>(null);

  const shareState = useShareableState<UnitShare>({
    toolId: 'unit-converter',
    version: UNIT_SHARE_VERSION,
    parse: (state) => parseUnitShare(state),
    select: () => ({
      category: category.id,
      value: s.amount ?? 0,
      unit: s.editing.unit,
    }),
  });
  // A shared link fills the converter once.
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    const l = shareState.loaded;
    s.setCategory(l.category, s.show(l.unit, l.value));
  }

  useToolCommands('unit-converter', [
    {
      id: 'convert',
      label: 'Convert…',
      run: () => freeRef.current?.focus(),
    },
  ]);

  const onFree = (text: string) => {
    setFree(text);
    const r = parseFreeText(text);
    const c = r && getCategory(r.category, { basePx: settings.basePx });
    const from = c && r && findUnit(c, r.from);
    if (!r || !c || !from) {
      setFreeResult(null);
      return;
    }
    s.setCategory(r.category, s.show(r.from, r.value));
    const to = r.to ? findUnit(c, r.to) : undefined;
    setFreeResult(
      to
        ? `${formatNumber(convert(r.value, from, to), { significant: settings.precision, locale: s.tag })} ${to.symbol}`
        : `${c.label}: see every unit below`,
    );
  };

  return (
    <Stack gap="6">
      <Card>
        <CardBody>
          <FreeText
            value={free}
            onChange={onFree}
            result={freeResult}
            inputRef={freeRef}
          />
        </CardBody>
      </Card>

      <Grid cols={{ base: 1, lg: 3 }} gap="6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Stack gap="3">
              <Inline justify="between" align="center">
                <CardTitle as="h2">{category.label}</CardTitle>
                <ShareButton share={shareState} />
              </Inline>
              <Stack gap="1">
                <Label htmlFor="unit-category">Category</Label>
                <Select
                  id="unit-category"
                  value={category.id}
                  onValueChange={(id) => s.setCategory(id)}
                  items={CATEGORIES.map((c) => ({
                    value: c.id,
                    label: c.label,
                  }))}
                />
              </Stack>
            </Stack>
          </CardHeader>
          <CardBody>
            <AllUnits
              category={category}
              values={s.values}
              editing={s.editing}
              invalid={s.invalid}
              onEdit={(unit, text) => s.setEditing({ unit, text })}
              pinned={s.pinned}
              onTogglePin={s.togglePin}
              copiedKey={copiedKey}
              onCopy={(unit, text) => void copy(text, unit)}
            />
          </CardBody>
        </Card>

        <Stack gap="6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Options</CardTitle>
            </CardHeader>
            <CardBody>
              <Stack gap="3">
                <Stack gap="1">
                  <Label htmlFor="unit-precision">Significant digits</Label>
                  <NumberInput
                    id="unit-precision"
                    value={settings.precision}
                    min={3}
                    max={17}
                    onValueChange={(precision) => update({ precision })}
                  />
                </Stack>
                <SegmentedControl<UnitSettings['locale']>
                  label="Decimal mark"
                  size="sm"
                  value={settings.locale}
                  onChange={(locale) => update({ locale })}
                  options={[
                    { value: 'auto', label: 'Browser' },
                    { value: 'dot', label: 'Point' },
                    { value: 'comma', label: 'Comma' },
                  ]}
                />
                {category.id === 'typography' && (
                  <Stack gap="1">
                    <Label htmlFor="unit-base-px">Base font size (px)</Label>
                    <NumberInput
                      id="unit-base-px"
                      value={settings.basePx}
                      min={1}
                      max={200}
                      onValueChange={(basePx) => update({ basePx })}
                    />
                  </Stack>
                )}
              </Stack>
            </CardBody>
          </Card>
          <HistoryList
            history={settings.history}
            precision={settings.precision}
            locale={s.tag}
            basePx={settings.basePx}
            onUse={(h) => s.setCategory(h.category, s.show(h.from, h.amount))}
            onClear={() => update({ history: [] })}
          />
        </Stack>
      </Grid>
    </Stack>
  );
};

export default UnitConverter;
