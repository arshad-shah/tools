import {
  Button,
  Card,
  NumberField,
  Popover,
  SegmentedControl,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import { sliders } from '@arshad-shah/cynosure/icons';
import React, { useRef, useState } from 'react';
import { ShareButton, ToolActions, TransformLayout } from '@/app/ui/transform';
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

/**
 * Unit Converter (redesign spec, transform pattern): every unit of a
 * category as an editable row, beside quick free-text conversion and the
 * recent conversions.
 */
const UnitConverter: React.FC = () => {
  const s = useUnitConverter();
  const { settings, update, category } = s;
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

  const display = (
    <Popover
      label="Number display"
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={sliders}>
          Display
        </Button>
      )}
    >
      <Stack gap="4">
        <NumberField
          label="Significant digits"
          value={settings.precision}
          min={3}
          max={17}
          onChange={(precision) => precision !== null && update({ precision })}
        />
        <Stack gap="2">
          <SegmentedControl
            label="Decimal mark"
            size="sm"
            value={settings.locale}
            onChange={(locale) =>
              update({ locale: locale as UnitSettings['locale'] })
            }
            options={[
              { value: 'auto', label: 'Browser' },
              { value: 'dot', label: 'Point' },
              { value: 'comma', label: 'Comma' },
            ]}
          />
        </Stack>
        {category.id === 'typography' ? (
          <NumberField
            label="Base font size (px)"
            value={settings.basePx}
            min={1}
            max={200}
            onChange={(basePx) => basePx !== null && update({ basePx })}
          />
        ) : null}
      </Stack>
    </Popover>
  );

  const units = (
    <Card as="section" title={`${category.label} units`} actions={display}>
      <Stack gap="5">
        <Select
          label="Category"
          width="md"
          value={category.id}
          onChange={(id) => s.setCategory(id)}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        />
        <AllUnits
          category={category}
          values={s.values}
          editing={s.editing}
          invalid={s.invalid}
          onEdit={(unit, text) => s.setEditing({ unit, text })}
          pinned={s.pinned}
          onTogglePin={s.togglePin}
        />
      </Stack>
    </Card>
  );

  const side = (
    <HistoryList
      history={settings.history}
      precision={settings.precision}
      locale={s.tag}
      basePx={settings.basePx}
      onUse={(h) => s.setCategory(h.category, s.show(h.from, h.amount))}
      onClear={() => update({ history: [] })}
    />
  );

  return (
    <Stack gap="6">
      <ToolActions>
        <ShareButton share={shareState} />
      </ToolActions>
      <Card as="section" title="Quick convert">
        <FreeText
          value={free}
          onChange={onFree}
          result={freeResult}
          inputRef={freeRef}
        />
      </Card>
      <TransformLayout start={units} end={side} defaultSize={58} />
    </Stack>
  );
};

export default UnitConverter;
