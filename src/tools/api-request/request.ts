import { ToolError } from '@/shared/lib/errors';
import type {
  BodyType,
  HeaderType,
  ParamType,
  RequestTypeMode,
  ResponseType,
} from '../../types/ApiTesterTypes'; // PR C moves this to ./types

export interface RequestInput {
  requestType: RequestTypeMode;
  method: string;
  url: string;
  params: ParamType[];
  headers: HeaderType[];
  bodyType: BodyType;
  body: string;
  graphqlQuery: string;
  graphqlVariables: string;
}

/** Appends enabled params with a non-blank key; an invalid URL is returned as is. */
export function buildUrl(url: string, params: ParamType[]): string {
  try {
    const parsed = new URL(url);
    params
      .filter((p) => p.enabled && p.key.trim())
      .forEach((p) => parsed.searchParams.append(p.key, p.value));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Trimmed headers; rows with a blank key or value are dropped. */
function headerRecord(headers: HeaderType[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    if (h.key.trim() && h.value.trim()) out[h.key.trim()] = h.value.trim();
  }
  return out;
}

export function buildRestInit(input: {
  method: string;
  headers: HeaderType[];
  bodyType: BodyType;
  body: string;
}): { headers: Record<string, string>; body?: BodyInit } {
  const headers = headerRecord(input.headers);
  if (input.method === 'GET') return { headers };
  if (input.bodyType === 'json' && input.body.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.body);
    } catch (cause) {
      throw new ToolError('INVALID_INPUT', 'Invalid JSON in request body', {
        cause,
      });
    }
    headers['Content-Type'] = 'application/json';
    return { headers, body: JSON.stringify(parsed) };
  }
  if (input.bodyType === 'x-www-form-urlencoded') {
    const form = new URLSearchParams();
    input.body.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) form.append(k, v || '');
    });
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return { headers, body: form };
  }
  return { headers };
}

export function buildGraphqlInit(input: {
  headers: HeaderType[];
  query: string;
  variables: string;
}): { headers: Record<string, string>; body: string } {
  const headers = {
    'Content-Type': 'application/json',
    ...headerRecord(input.headers),
  };
  let variables: unknown = {};
  if (input.variables.trim()) {
    try {
      variables = JSON.parse(input.variables);
    } catch (cause) {
      throw new ToolError(
        'INVALID_INPUT',
        'Invalid JSON in GraphQL variables',
        { cause },
      );
    }
  }
  return { headers, body: JSON.stringify({ query: input.query, variables }) };
}

/**
 * Sends the user's request. A network failure resolves to a status-0
 * response (shown in the response panel); invalid input and cancellation
 * reject.
 */
export async function sendRequest(
  input: RequestInput,
  signal: AbortSignal,
  now: () => number = () => performance.now(),
): Promise<ResponseType> {
  if (!input.url) throw new ToolError('INVALID_INPUT', 'Please enter a URL');
  const isRest = input.requestType === 'rest';
  const { url, init } = isRest
    ? {
        // As before, params are only applied to GET requests.
        url:
          input.method === 'GET'
            ? buildUrl(input.url, input.params)
            : input.url,
        init: { method: input.method, ...buildRestInit(input) },
      }
    : {
        url: input.url,
        init: {
          method: 'POST',
          ...buildGraphqlInit({
            headers: input.headers,
            query: input.graphqlQuery,
            variables: input.graphqlVariables,
          }),
        },
      };
  const start = now();
  try {
    const res = await fetch(url, { ...init, signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const contentType = res.headers.get('content-type');
    const data: unknown =
      !isRest || contentType?.includes('application/json')
        ? await res.json()
        : await res.text();
    return {
      status: res.status,
      statusText: res.statusText,
      time: Math.round(now() - start),
      headers,
      data,
    };
  } catch (err) {
    if (signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    return {
      status: 0,
      statusText: 'Network error',
      time: Math.round(now() - start),
      headers: {},
      data: {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to connect to the server',
      },
    };
  }
}
