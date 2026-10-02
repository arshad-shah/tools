import { useClipboard } from '@/shared/lib/clipboard';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Image,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import { IconCheck, IconCopy } from '@/shared/ui/icons';
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

function GpsCoordinates({ lat, lon }: { lat: number; lon: number }) {
  const { copied, copy } = useClipboard();
  const text = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  return (
    <Inline gap="2" align="center" wrap>
      <Text as="span" size="sm" mono>
        {text}
      </Text>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
        onClick={() => void copy(text)}
      >
        {copied ? 'Copied' : 'Copy coordinates'}
      </Button>
    </Inline>
  );
}

function GroupTable({
  group,
  rows,
  meta,
}: {
  group: MetaGroup;
  rows: [string, string][];
  meta: Metadata;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{GROUP_LABEL[group]}</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          {group === 'gps' && meta.gps ? (
            <Stack gap="1">
              <Text size="sm" tone="muted">
                Decimal coordinates
              </Text>
              <GpsCoordinates lat={meta.gps.lat} lon={meta.gps.lon} />
            </Stack>
          ) : null}
          <Table aria-label={`${GROUP_LABEL[group]} metadata`}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Tag</TableHead>
                <TableHead scope="col">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([key, value], i) => (
                <TableRow key={`${key}-${i}`}>
                  <TableCell className="font-mono text-xs">{key}</TableCell>
                  <TableCell className="break-all">{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </CardBody>
    </Card>
  );
}

/** One table per non-empty metadata group, plus the embedded thumbnail. */
export function MetaTables({ meta }: { meta: Metadata }) {
  const groups = GROUPS.filter((g) => meta.groups[g].length > 0);
  return (
    <Stack gap="3">
      {meta.thumbnail ? (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Embedded thumbnail</CardTitle>
          </CardHeader>
          <CardBody>
            <Box className="max-w-48">
              <Image
                src={meta.thumbnail}
                mime="image/jpeg"
                alt="Embedded EXIF thumbnail"
                fit="contain"
                className="rounded-md border border-line"
              />
            </Box>
          </CardBody>
        </Card>
      ) : null}
      {groups.length === 0 ? (
        <Text size="sm" tone="muted">
          No metadata found in this file.
        </Text>
      ) : (
        groups.map((g) => (
          <GroupTable key={g} group={g} rows={meta.groups[g]} meta={meta} />
        ))
      )}
    </Stack>
  );
}
