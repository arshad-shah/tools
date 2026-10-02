import React from 'react';
import { Heading, Stack, Text } from '@/shared/ui';

/** One gallery area; the test id is the visual-regression target. */
export function Section({
  name,
  title,
  children,
}: {
  name: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={`kit-section-${name}`}
      aria-labelledby={`kit-${name}`}
      className="rounded-xl bg-canvas p-6"
    >
      <Stack gap="4">
        <Heading level={2} size="lg" id={`kit-${name}`}>
          {title}
        </Heading>
        {children}
      </Stack>
    </section>
  );
}

/** A labelled row of examples. */
export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="2">
      <Text size="xs" tone="subtle" mono>
        {label}
      </Text>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Stack>
  );
}
