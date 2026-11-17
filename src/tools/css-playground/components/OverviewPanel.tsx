import { Grid, Stack, Stat, Table, Text } from '@arshad-shah/cynosure';
import { formatBytes } from '@/shared/lib/format';
import type { CssReport } from '../lib/types';

const n = (v: number) => v.toLocaleString('en-US');

/** Counts at a glance, the most used properties and the at-rules. */
export function OverviewPanel({ report }: { report: CssReport }) {
  const s = report.stats;
  const atRules = Object.entries(s.atRules).sort((a, b) => b[1] - a[1]);
  return (
    <Stack gap="5">
      <Grid minItemWidth="9rem" gap="4">
        <Stat
          label="Size"
          value={formatBytes(s.bytes)}
          description={`${n(s.lines)} lines`}
        />
        <Stat label="Rules" value={n(s.rules)} />
        <Stat label="Selectors" value={n(s.selectors)} />
        <Stat label="Declarations" value={n(s.declarations)} />
        <Stat label="Unique properties" value={n(s.uniqueProperties)} />
        <Stat label="Colours" value={n(report.colours.length)} />
        <Stat label="Variables" value={n(report.customProperties.length)} />
        <Stat
          label="Highest specificity"
          value={s.maxSpecificity.join(', ')}
          description="IDs, classes, elements"
        />
        <Stat label="!important" value={n(s.important)} />
      </Grid>
      <Grid minItemWidth="18rem" gap="5">
        <Table
          caption="Most used properties"
          size="sm"
          stickyHeader
          getRowId={(r) => r.property}
          rows={report.properties.slice(0, 25)}
          labels={{ empty: 'No declarations yet' }}
          columns={[
            {
              key: 'property',
              header: 'Property',
              rowHeader: true,
              cell: (r) => <Text variant="code">{r.property}</Text>,
            },
            {
              key: 'count',
              header: 'Uses',
              align: 'end',
              cell: (r) => n(r.count),
            },
          ]}
        />
        <Table
          caption="At-rules"
          size="sm"
          getRowId={(r) => r[0]}
          rows={atRules}
          labels={{ empty: 'No at-rules' }}
          columns={[
            {
              key: 'name',
              header: 'At-rule',
              rowHeader: true,
              cell: (r) => <Text variant="code">{`@${r[0]}`}</Text>,
            },
            {
              key: 'count',
              header: 'Count',
              align: 'end',
              cell: (r) => n(r[1]),
            },
          ]}
        />
      </Grid>
    </Stack>
  );
}
