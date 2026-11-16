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
import { useEffect, useRef, useState } from 'react';
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
  onToggle?(index: number, checked: boolean): void;
}) {
  const page = doc.pages[index];
  const { src } = usePageImage(doc.docId, index, 240);
  const ratio = page ? page.width / page.height : 1 / Math.SQRT2;
  const label = `Page ${index + 1}`;
  return (
    <Card
      padding="sm"
      variant={selected ? 'soft' : 'surface'}
      tone={selected ? 'accent' : 'neutral'}
    >
      <Stack gap="3">
        {src ? (
          <Image
            src={src}
            alt={label}
            ratio={ratio}
            fit="contain"
            radius="sm"
          />
        ) : (
          <Skeleton shape="block" height="10rem" />
        )}
        {onToggle ? (
          <Checkbox
            size="sm"
            label={label}
            checked={!!selected}
            onChange={(checked) => onToggle(index, checked)}
          />
        ) : (
          <Text size="sm" tone="muted" align="center">
            {label}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

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
  // Checkbox reports only the new value, so whether Shift was held comes
  // from the press itself (a recorded Cynosure gap: no range selection).
  const shift = useRef(false);
  useEffect(() => {
    const note = (e: PointerEvent | KeyboardEvent) => {
      shift.current = e.shiftKey;
    };
    window.addEventListener('pointerdown', note, true);
    window.addEventListener('keydown', note, true);
    return () => {
      window.removeEventListener('pointerdown', note, true);
      window.removeEventListener('keydown', note, true);
    };
  }, []);
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
              onToggle={
                onToggle
                  ? (index, checked) => onToggle(index, checked, shift.current)
                  : undefined
              }
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
