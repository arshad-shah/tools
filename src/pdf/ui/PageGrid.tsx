import {
  Card,
  Checkbox,
  Grid,
  GridItem,
  Image,
  Pagination,
  Skeleton,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { DocInfo } from '@/pdf/render';
import { usePageImage } from './use-first-page-image';

/** Pages shown at once: a long document is paged, not rendered whole. */
const PER_PAGE = 24;

function PageTile({
  doc,
  index,
  selected,
  onToggle,
}: {
  doc: DocInfo;
  index: number;
  selected?: boolean;
  onToggle?(index: number, checked: boolean, range: boolean): void;
}) {
  const page = doc.pages[index];
  const { src } = usePageImage(doc.docId, index, 240);
  const ratio = page ? page.width / page.height : 1 / Math.SQRT2;
  const label = `Page ${index + 1}`;
  const picture = src ? (
    <Image src={src} alt={label} ratio={ratio} fit="contain" radius="sm" />
  ) : (
    <Skeleton shape="block" height="10rem" />
  );
  return onToggle ? (
    <Checkbox
      variant="card"
      media={picture}
      size="sm"
      label={label}
      checked={!!selected}
      onChange={(checked, event) =>
        onToggle(index, checked, nativeShift(event.nativeEvent))
      }
    />
  ) : (
    <Card padding="sm">
      <Stack gap="3">
        {picture}
        <Text size="sm" tone="muted" align="center">
          {label}
        </Text>
      </Stack>
    </Card>
  );
}

/** Whether Shift was held for the click or key press behind a change. */
const nativeShift = (e: Event) =>
  'shiftKey' in e && !!(e as MouseEvent).shiftKey;

/**
 * The pages of an open PDF as a grid of thumbnails (rendered by the pdf.js
 * worker), each with a checkbox when pages can be chosen. Long documents
 * are shown 24 pages at a time.
 */
export function PageGrid({
  doc,
  selected,
  onToggle,
  label = 'Pages',
}: {
  doc: DocInfo;
  selected?: ReadonlySet<number>;
  /** `range`: Shift was held, so the pages since the last one ticked go too. */
  onToggle?(index: number, checked: boolean, range: boolean): void;
  label?: string;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.ceil(doc.pageCount / PER_PAGE);
  const first = (page - 1) * PER_PAGE;
  const indices = Array.from(
    { length: Math.min(PER_PAGE, doc.pageCount - first) },
    (_, i) => first + i,
  );
  return (
    <Stack gap="5">
      <Grid
        as="ul"
        minItemWidth="8.5rem"
        columns={6}
        gap="4"
        aria-label={label}
      >
        {indices.map((i) => (
          <GridItem as="li" key={i}>
            <PageTile
              doc={doc}
              index={i}
              selected={selected?.has(i)}
              onToggle={onToggle}
            />
          </GridItem>
        ))}
      </Grid>
      {pages > 1 ? (
        <Pagination count={pages} page={page} onChange={setPage} size="sm" />
      ) : null}
    </Stack>
  );
}
