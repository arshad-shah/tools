import { useEffect, useMemo, useState } from 'react';
import { convert } from '../lib/convert';
import { formatNumber, parseLocaleNumber } from '../lib/format';
import { localeTag } from '../lib/locale';
import { CATEGORIES, findUnit, getCategory } from '../lib/units';
import { addHistory, unitSettings, type UnitHistoryEntry } from '../settings';

/** History is added once the input settles (spec §8.5), not on blur. */
export const SETTLE_MS = 800;

/** The Unit Converter's state: category, the row being typed, all values. */
export function useUnitConverter() {
  const [settings, update] = unitSettings.useSettings();
  const category =
    getCategory(settings.category, { basePx: settings.basePx }) ??
    CATEGORIES[0];
  const [editing, setEditing] = useState(() => ({
    unit: category.units[0].id,
    text: '1',
  }));
  const tag = localeTag(settings.locale);
  const fromUnit = findUnit(category, editing.unit) ?? category.units[0];
  const amount = editing.text.trim()
    ? parseLocaleNumber(editing.text, tag)
    : null;
  const invalid = editing.text.trim() !== '' && amount === null;

  const values = useMemo(() => {
    const out: Record<string, string> = {};
    if (amount === null) return out;
    for (const u of category.units)
      out[u.id] = formatNumber(convert(amount, fromUnit, u), {
        significant: settings.precision,
        locale: tag,
      });
    return out;
  }, [amount, category, fromUnit, settings.precision, tag]);

  const pinned = useMemo(
    () =>
      new Set(
        settings.favourites
          .filter((f) => f.startsWith(`${category.id}:`))
          .map((f) => f.slice(category.id.length + 1)),
      ),
    [settings.favourites, category.id],
  );

  // The unit the history entry converts to: the first pinned other unit,
  // else the next unit in the list.
  const toUnit =
    category.units.find((u) => pinned.has(u.id) && u.id !== fromUnit.id) ??
    category.units.find((u) => u.id !== fromUnit.id) ??
    fromUnit;

  useEffect(() => {
    if (amount === null) return;
    const entry: UnitHistoryEntry = {
      category: category.id,
      from: fromUnit.id,
      to: toUnit.id,
      amount,
      at: 0,
    };
    const id = setTimeout(() => {
      const { history } = unitSettings.getSettings();
      update({ history: addHistory(history, { ...entry, at: Date.now() }) });
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, [amount, category.id, fromUnit.id, toUnit.id, update]);

  const setCategory = (id: string, edit?: { unit: string; text: string }) => {
    const next = getCategory(id, { basePx: settings.basePx });
    if (!next) return;
    if (id !== category.id) update({ category: id });
    setEditing(edit ?? { unit: next.units[0].id, text: '1' });
  };

  const togglePin = (unit: string) => {
    const key = `${category.id}:${unit}`;
    update({
      favourites: settings.favourites.includes(key)
        ? settings.favourites.filter((f) => f !== key)
        : [...settings.favourites, key],
    });
  };

  /** Shows a number in a unit, written for the current locale. */
  const show = (unit: string, value: number) =>
    ({
      unit,
      text: formatNumber(value, {
        significant: settings.precision,
        locale: tag,
      }),
    }) as const;

  return {
    settings,
    update,
    category,
    editing,
    setEditing,
    invalid,
    amount,
    values,
    pinned,
    togglePin,
    setCategory,
    show,
    tag,
  };
}
