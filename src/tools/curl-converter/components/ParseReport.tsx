import {
  Badge,
  DescriptionList,
  Inline,
  List,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import type { CurlRequest } from '../lib/model';
import type { IgnoredOption } from '../lib/parse';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function bodyText(req: CurlRequest): string {
  const b = req.body;
  switch (b.kind) {
    case 'none':
      return 'None';
    case 'data':
      return `Text, ${plural(new TextEncoder().encode(b.text).length, 'byte')}`;
    case 'file':
      return b.upload ? `Upload of ${b.path}` : `Contents of ${b.path}`;
    case 'form':
      return `Multipart, ${plural(b.fields.length, 'field')}`;
  }
}

/** What the command parsed to, in words. */
export function RequestSummary({ request: r }: { request: CurlRequest }) {
  const options = [
    r.compressed && 'compressed',
    r.insecure && 'skip TLS checks',
    r.location && 'follow redirects',
  ].filter(Boolean) as string[];
  const query = URL.canParse(r.url)
    ? [...new URL(r.url).searchParams.keys()].length
    : 0;
  return (
    <DescriptionList
      size="sm"
      divided
      items={[
        {
          term: 'Request',
          detail: (
            <Inline gap="2" align="center" wrap>
              <Badge size="sm" tone="accent">
                {r.method}
              </Badge>
              <Text size="sm" variant="code" wrap="break">
                {r.url}
              </Text>
            </Inline>
          ),
        },
        { term: 'Query', detail: plural(query, 'parameter') },
        {
          term: 'Headers',
          detail: r.headers.length
            ? r.headers.map((h) => h.name).join(', ')
            : 'None',
        },
        { term: 'Body', detail: bodyText(r) },
        {
          term: 'Auth',
          detail: r.auth ? `Basic, user ${r.auth.user}` : 'None',
        },
        ...(r.cookie ? [{ term: 'Cookies', detail: r.cookie }] : []),
        ...(options.length
          ? [{ term: 'Options', detail: options.join(', ') }]
          : []),
      ]}
    />
  );
}

/** The options left out of the conversion and the caveats, never silent. */
export function ParseReport({
  ignored,
  warnings,
}: {
  ignored: IgnoredOption[];
  warnings: string[];
}) {
  if (!ignored.length && !warnings.length) return null;
  return (
    <Stack gap="3">
      {ignored.length ? (
        <Notice
          tone="warning"
          title={`${plural(ignored.length, 'option')} not converted`}
        >
          <List
            gap="sm"
            items={ignored.map((i, n) => ({
              id: `${n}`,
              label: (
                <Text size="sm" variant="code" wrap="break">
                  {i.value !== undefined ? `${i.option} ${i.value}` : i.option}
                </Text>
              ),
              description: i.reason,
            }))}
          />
        </Notice>
      ) : null}
      {warnings.length ? (
        <Notice tone="info" title="Converted with changes">
          <List
            gap="sm"
            items={warnings.map((w, n) => ({ id: `${n}`, label: w }))}
          />
        </Notice>
      ) : null}
    </Stack>
  );
}
