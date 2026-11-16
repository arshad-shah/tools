import {
  Card,
  CopyButton,
  DescriptionList,
  EmptyState,
  Grid,
  Image,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useObjectUrl } from '@/shared/lib/object-url';
import { GROUPS, type MetaGroup, type Metadata } from '../lib/read';

const GROUP_LABEL: Record<MetaGroup, string> = {
  camera: 'Camera',
  exposure: 'Exposure',
  image: 'Image',
  dates: 'Dates',
  gps: 'GPS',
  software: 'Software',
  iptc: 'IPTC',
  xmp: 'XMP',
  icc: 'ICC profile',
  other: 'Other',
};

function Thumbnail({ bytes }: { bytes: Uint8Array }) {
  const url = useObjectUrl(bytes, 'image/jpeg');
  if (!url) return null;
  return (
    <Card as="section" title="Embedded thumbnail" headingLevel={2}>
      <Grid columns="12rem">
        <Image
          src={url}
          alt="Embedded EXIF thumbnail"
          fit="contain"
          radius="sm"
        />
      </Grid>
    </Card>
  );
}

/** One card per metadata group (tag and value), plus the embedded thumbnail. */
export function MetaGroups({ meta }: { meta: Metadata }) {
  const groups = GROUPS.filter((g) => meta.groups[g].length > 0);
  const gps = meta.gps
    ? `${meta.gps.lat.toFixed(6)}, ${meta.gps.lon.toFixed(6)}`
    : null;
  return (
    <Stack gap="5">
      {meta.thumbnail ? <Thumbnail bytes={meta.thumbnail} /> : null}
      {groups.length === 0 ? (
        <EmptyState
          size="sm"
          title="No metadata found"
          description="This file carries no EXIF, IPTC, XMP or ICC data."
        />
      ) : (
        groups.map((g) => (
          <Card key={g} as="section" title={GROUP_LABEL[g]} headingLevel={2}>
            <Stack gap="4">
              {g === 'gps' && gps ? (
                <Inline gap="3" align="center" wrap>
                  <Text size="sm" tone="muted">
                    Decimal coordinates
                  </Text>
                  <Text variant="code">{gps}</Text>
                  <CopyButton
                    value={gps}
                    size="sm"
                    labels={{
                      copy: 'Copy coordinates',
                      copied: 'Coordinates copied',
                    }}
                  />
                </Inline>
              ) : null}
              <DescriptionList
                size="sm"
                divided
                items={meta.groups[g].map(([key, value], i) => ({
                  id: `${key}-${i}`,
                  term: key,
                  detail: (
                    <Text as="span" wrap="break">
                      {value}
                    </Text>
                  ),
                }))}
              />
            </Stack>
          </Card>
        ))
      )}
    </Stack>
  );
}
