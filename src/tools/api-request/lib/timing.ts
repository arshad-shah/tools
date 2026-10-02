export interface TimingBreakdown {
  dns: number;
  connect: number;
  tls: number;
  wait: number;
  download: number;
}

/**
 * Resource Timing phases for the last fetch of `url`, or null when the
 * server did not allow them (cross-origin without Timing-Allow-Origin
 * reports zeros).
 */
export function timingFor(url: string): TimingBreakdown | null {
  if (typeof performance === 'undefined' || !performance.getEntriesByName)
    return null;
  const e = performance
    .getEntriesByName(url)
    .filter((x): x is PerformanceResourceTiming => 'responseStart' in x)
    .at(-1);
  if (!e || e.responseStart === 0 || e.requestStart === 0) return null;
  const ms = (a: number, b: number) => Math.max(0, Math.round(b - a));
  return {
    dns: ms(e.domainLookupStart, e.domainLookupEnd),
    connect: ms(e.connectStart, e.connectEnd),
    tls:
      e.secureConnectionStart > 0
        ? ms(e.secureConnectionStart, e.connectEnd)
        : 0,
    wait: ms(e.requestStart, e.responseStart),
    download: ms(e.responseStart, e.responseEnd),
  };
}
