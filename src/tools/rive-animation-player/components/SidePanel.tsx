import { useState, type ReactNode } from 'react';
import {
  Box,
  Card,
  CardBody,
  Divider,
  Heading,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

const TABS = [
  ['controls', 'Controls'],
  ['stage', 'Stage'],
  ['data', 'Data'],
  ['info', 'Info'],
  ['export', 'Export'],
] as const;
export type SideTab = (typeof TABS)[number][0];

/** A titled block inside a tab. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="3">
      <Heading level={4} size="sm">
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

/** The settings card: one tab per area, each holding its sections. */
export function SidePanel({ tabs }: { tabs: Record<SideTab, ReactNode[]> }) {
  const [tab, setTab] = useState<SideTab>('controls');
  return (
    <Card>
      <CardBody>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as SideTab)}
          variant="line"
          fullWidth
        >
          <TabsList aria-label="Settings">
            {TABS.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(([value]) => (
            <TabsContent key={value} value={value}>
              <Box className="pt-3">
                <Stack gap="4">
                  {tabs[value].map((section, i) => (
                    <Stack gap="4" key={i}>
                      {i > 0 && <Divider />}
                      {section}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </TabsContent>
          ))}
        </Tabs>
      </CardBody>
    </Card>
  );
}
