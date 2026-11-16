import { Inline, LoadingDots, Text } from '@arshad-shah/cynosure';

/** A lazy page or tool still loading. */
export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <Inline
      gap="4"
      align="center"
      justify="center"
      paddingBlock="10"
      role="status"
    >
      <LoadingDots tone="muted" />
      <Text tone="muted">{label}</Text>
    </Inline>
  );
}
