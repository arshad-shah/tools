import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  List,
  ListItem,
  Stack,
  Text,
} from '@/shared/ui';
import type { Risk } from '../lib/risk';

const LEVEL = {
  high: { label: 'High risk', tone: 'danger' },
  low: { label: 'Low risk', tone: 'warning' },
  none: { label: 'No risk found', tone: 'success' },
} as const;

const SUMMARY = {
  high: 'This photo reveals where it was taken.',
  low: 'This photo can be linked to a device or a person.',
  none: 'No location, serial number or owner name was found.',
} as const;

/** The privacy summary for one file (GPS is shown as numbers, never a map). */
export function RiskSummary({ risk }: { risk: Risk }) {
  const level = LEVEL[risk.level];
  return (
    <Card>
      <CardHeader>
        <Inline gap="2" align="center" justify="between" wrap>
          <CardTitle as="h2">Privacy</CardTitle>
          <Badge variant="soft" tone={level.tone} data-testid="risk-level">
            {level.label}
          </Badge>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          <Text size="sm" tone="muted">
            {SUMMARY[risk.level]}
          </Text>
          {risk.reasons.length > 0 ? (
            <List aria-label="Risks found">
              {risk.reasons.map((r) => (
                <ListItem key={r}>{r}</ListItem>
              ))}
            </List>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
