import type { ChartRef } from '@arshad-shah/swift-chart/react';

/** The chart as drawn, as a PNG blob (null before it is mounted). */
export function chartPng(ref: ChartRef | null): Blob | null {
  const url = ref?.toDataURL('image/png');
  if (!url) return null;
  const [head, body] = url.split(',', 2);
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(body ?? '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
