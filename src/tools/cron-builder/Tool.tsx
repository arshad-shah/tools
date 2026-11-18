import {
  Card,
  CopyButton,
  Grid,
  Heading,
  SegmentedControl,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useMemo, useState } from 'react';
import { ShareButton, ToolActions, TransformLayout } from '@/app/ui/transform';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { FieldEditor } from './components/FieldEditor';
import { NextRuns } from './components/NextRuns';
import { Presets } from './components/Presets';
import { explainCron } from './lib/explain';
import { convertFlavour, fromUnix } from './lib/flavour';
import {
  CronError,
  parseCron,
  type CronAst,
  type CronFlavour,
  type FieldName,
} from './lib/parse';
import { cronSettings } from './settings';
import { CRON_SHARE_VERSION, parseCronShare, type CronShare } from './share';

const FLAVOURS: { value: CronFlavour; label: string }[] = [
  { value: 'unix', label: 'Unix' },
  { value: 'seconds', label: 'With seconds' },
  { value: 'quartz', label: 'Quartz' },
];

const LAYOUT: Record<CronFlavour, FieldName[]> = {
  unix: ['minute', 'hour', 'dom', 'month', 'dow'],
  seconds: ['second', 'minute', 'hour', 'dom', 'month', 'dow'],
  quartz: ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'],
};

type Parsed =
  | { ok: true; ast: CronAst; explanation: string }
  | { ok: false; message: string; column: number };

function parse(expr: string, flavour: CronFlavour): Parsed {
  try {
    const ast = parseCron(expr, flavour);
    return { ok: true, ast, explanation: explainCron(ast) };
  } catch (e) {
    if (e instanceof CronError)
      return { ok: false, message: e.message, column: e.column };
    return { ok: false, message: 'This expression cannot be read', column: 1 };
  }
}

/** The fields the editors show, or null for a macro or a wrong count. */
function fieldsOf(expr: string, flavour: CronFlavour) {
  const t = expr.trim();
  if (!t || t.startsWith('@')) return null;
  const parts = t.split(/\s+/);
  const layout = LAYOUT[flavour];
  const fits =
    parts.length === layout.length ||
    (flavour === 'quartz' && parts.length === 6);
  return fits ? parts.map((text, i) => ({ name: layout[i], text })) : null;
}

/**
 * Cron Expression Builder (redesign spec, transform pattern): the
 * expression and its fields beside what it means and when it runs next.
 */
const CronBuilder: React.FC = () => {
  const [settings, update] = cronSettings.useSettings();
  const { flavour, zone, count } = settings;
  const [expr, setExpr] = useState(() =>
    fromUnix('0 9 * * 1-5', settings.flavour),
  );

  const shareState = useShareableState<CronShare>({
    toolId: 'cron-builder',
    version: CRON_SHARE_VERSION,
    parse: (state) => parseCronShare(state),
    select: () => ({ expr, flavour, zone }),
  });
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    const l = shareState.loaded;
    setExpr(l.expr);
    update({ flavour: l.flavour, zone: l.zone });
  }

  const parsed = useMemo(() => parse(expr, flavour), [expr, flavour]);
  const fields = fieldsOf(expr, flavour);
  const setField = (index: number, text: string) => {
    if (!fields) return;
    const next = fields.map((f, i) =>
      i === index ? text.replace(/\s+/g, '') || '*' : f.text,
    );
    setExpr(next.join(' '));
  };
  const switchFlavour = (to: CronFlavour) => {
    if (to === flavour) return;
    setExpr(convertFlavour(expr, flavour, to));
    update({ flavour: to });
  };

  const input = (
    <Stack gap="6">
      <Card
        as="section"
        title="Expression"
        actions={<Presets flavour={flavour} onPick={setExpr} />}
      >
        <Stack gap="5">
          <SegmentedControl
            label="Cron flavour"
            size="sm"
            value={flavour}
            onChange={(v) => switchFlavour(v as CronFlavour)}
            options={FLAVOURS}
          />
          <TextField
            label="Cron expression"
            labelHidden
            size="lg"
            value={expr}
            onChange={setExpr}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            error={parsed.ok ? undefined : parsed.message}
            addonEnd={
              <CopyButton
                size="sm"
                value={expr.trim()}
                labels={{ copy: 'Copy expression' }}
              />
            }
          />
          {parsed.ok ? null : (
            <Text size="sm" tone="muted">{`Column ${parsed.column}`}</Text>
          )}
          {parsed.ok ? (
            <Heading level={3} size="md" aria-live="polite">
              {parsed.explanation}
            </Heading>
          ) : null}
        </Stack>
      </Card>
      <NextRuns
        ast={parsed.ok ? parsed.ast : null}
        zone={zone}
        onZone={(z) => update({ zone: z })}
        count={count}
        onCount={(c) => update({ count: c })}
      />
    </Stack>
  );

  const output = (
    <Card as="section" title="Fields">
      {fields ? (
        <Grid minItemWidth="18rem" gap="6">
          {fields.map((f, i) => (
            <FieldEditor
              key={f.name}
              field={f.name}
              flavour={flavour}
              text={f.text}
              onText={(text) => setField(i, text)}
            />
          ))}
        </Grid>
      ) : (
        <Text size="sm" tone="muted">
          The field editors need an expression with the right number of fields
          (macros such as @daily are edited as text).
        </Text>
      )}
    </Card>
  );

  return (
    <Stack gap="6">
      <ToolActions>
        <ShareButton share={shareState} />
      </ToolActions>
      <TransformLayout start={input} end={output} defaultSize={52} />
    </Stack>
  );
};

export default CronBuilder;
