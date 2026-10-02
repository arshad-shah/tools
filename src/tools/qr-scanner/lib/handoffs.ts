import type { HandoffPayload } from '@/shared/lib/handoff';
import type { DecodedBarcode } from '@/shared/lib/qr-decode';
import { interpret } from './interpret';

/** Receiving tools of a decoded code's direct hand-off buttons. */
export type ResultTarget =
  | 'url-parser'
  | 'qr-code-generator'
  | 'url-encoder-decoder';

/** The hand-offs that fit one decoded code, keyed by receiving tool. */
export function resultHandoffs(
  result: DecodedBarcode,
): Partial<Record<ResultTarget, HandoffPayload>> {
  const info = interpret(result.text);
  const link =
    info.fields.find(([l]) => l === 'URL')?.[1] ?? result.text.trim();
  const uriList: HandoffPayload = {
    kind: 'text',
    mime: 'text/uri-list',
    sourceTool: 'qr-scanner',
    text: link,
  };
  const out: Partial<Record<ResultTarget, HandoffPayload>> = {};
  if (info.actions.includes('url-inspector')) out['url-parser'] = uriList;
  if (info.kind === 'url') out['qr-code-generator'] = uriList;
  if (info.actions.includes('text-encoder'))
    out['url-encoder-decoder'] = {
      kind: 'text',
      mime: 'text/plain',
      sourceTool: 'qr-scanner',
      text: result.text,
    };
  return out;
}
