import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Inline,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { cornerDownLeft, trash } from '@arshad-shah/cynosure/icons';
import { InspectorSection } from '../../ui/InspectorSection';
import { currentAuthor } from '@/pdf/doc/ops';
import type { ModeProps } from '../types';
import { relativeTime } from '../../relative-time';
import { commentRows, type CommentRow } from './comments-rows';
import { useAllExisting } from './existing';
import { getAnnotateUi, setAnnotateUi, useAnnotateUi } from './ui-store';

const ALL = '*';

/** Centres the annotation's anchor in the canvas and focuses its page. */
function goTo(ctx: ModeProps, row: CommentRow) {
  const [x, y] = row.anchor;
  ctx.doc.goToPage(row.pageId, {
    box: { x, y, width: 1, height: 1 },
    focus: true,
  });
}

function AuthorField({ ctx }: { ctx: ModeProps }) {
  const author = currentAuthor(ctx.doc.view);
  const [draft, setDraft] = useState<{ base: string; value: string } | null>(
    null,
  );
  const value = draft?.base === author ? draft.value : author;
  const commit = () => {
    const name = value.trim();
    setDraft(null);
    if (name && name !== author)
      ctx.doc.dispatch({ type: 'annot.author', params: { name } });
  };
  return (
    <Form label="Comment author" onSubmit={commit}>
      <TextField
        label="Your name for comments"
        size="sm"
        value={value}
        maxLength={200}
        onChange={(v) => setDraft({ base: author, value: v })}
        onBlur={commit}
      />
    </Form>
  );
}

/** Colour, opacity and width moved to the toolbar's Style control (P5-D). */
function StyleSection() {
  const ui = useAnnotateUi();
  return (
    <InspectorSection title="Display">
      <Switch
        label="Hide existing annotations"
        checked={ui.hideExisting}
        onChange={(hideExisting) => setAnnotateUi({ hideExisting })}
      />
    </InspectorSection>
  );
}

function Row({
  row,
  ctx,
  all,
}: {
  row: CommentRow;
  ctx: ModeProps;
  all: CommentRow[];
}) {
  const parent = row.replyTo ? all.find((r) => r.key === row.replyTo) : null;
  const del = () =>
    ctx.doc.dispatch({
      type: 'annot.delete',
      params: { pageId: row.pageId, target: row.target },
    });
  return (
    <Card as="li" variant="outline" padding="sm" data-testid="comment-row">
      <Stack gap="2">
        <Inline gap="2" justify="between" align="baseline" wrap>
          <Text size="sm" weight="medium">
            {row.author}
          </Text>
          <Text size="xs" tone="muted">
            {`${row.type}, page ${row.pageNumber}${row.at !== null ? `, ${relativeTime(row.at)}` : ''}`}
          </Text>
        </Inline>
        {parent ? (
          <Text size="xs" tone="muted">
            Reply to {parent.author}
          </Text>
        ) : null}
        {row.text ? (
          <Text as="p" size="sm">
            {row.text}
          </Text>
        ) : null}
        <Inline gap="1" wrap>
          <Button size="sm" variant="ghost" onClick={() => goTo(ctx, row)}>
            Go to
          </Button>
          {row.replyable ? (
            <Button
              size="sm"
              variant="ghost"
              icon={cornerDownLeft}
              onClick={() =>
                setAnnotateUi({
                  editor: {
                    kind: 'reply',
                    pageId: row.pageId,
                    at: row.anchor,
                    replyTo:
                      row.target.kind === 'pending'
                        ? { kind: 'pending', id: row.target.id }
                        : { kind: 'existing', ref: row.target.ref },
                  },
                })
              }
            >
              Reply
            </Button>
          ) : null}
          {row.editable ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setAnnotateUi({
                  editor: {
                    kind: 'edit',
                    pageId: row.pageId,
                    at: row.anchor,
                    target: row.target,
                    text: row.text,
                  },
                })
              }
            >
              Edit
            </Button>
          ) : null}
          {row.editable ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                ctx.doc.dispatch({
                  type: 'annot.update',
                  params: {
                    pageId: row.pageId,
                    target: row.target,
                    patch: { color: getAnnotateUi().color },
                  },
                })
              }
            >
              Use current colour
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            tone="danger"
            icon={trash}
            onClick={del}
          >
            Delete
          </Button>
        </Inline>
      </Stack>
    </Card>
  );
}

/** The pinned Annotate inspector: author, style, filters and the comments list. */
export function CommentsPanel(ctx: ModeProps) {
  const existing = useAllExisting(ctx.doc);
  const rows = useMemo(
    () => commentRows(ctx.doc, existing),
    [ctx.doc, existing],
  );
  const [page, setPage] = useState(ALL);
  const [author, setAuthor] = useState(ALL);
  const [type, setType] = useState(ALL);
  const distinct = (key: (r: CommentRow) => string) =>
    [...new Set(rows.map(key))].sort();
  const shown = rows.filter(
    (r) =>
      (page === ALL || String(r.pageNumber) === page) &&
      (author === ALL || r.author === author) &&
      (type === ALL || r.type === type),
  );
  return (
    <Stack gap="2">
      <InspectorSection title="Comments">
        <Stack gap="3">
          <AuthorField ctx={ctx} />
          {/* Filters only once there is something to filter. */}
          {rows.length === 0 ? null : (
            <Stack gap="2">
              <Select
                label="Filter by page"
                labelHidden
                size="sm"
                value={page}
                onChange={setPage}
                options={[
                  { value: ALL, label: 'All pages' },
                  ...[...new Set(rows.map((r) => r.pageNumber))]
                    .sort((a, b) => a - b)
                    .map((n) => ({ value: String(n), label: `Page ${n}` })),
                ]}
              />
              <Select
                label="Filter by author"
                labelHidden
                size="sm"
                value={author}
                onChange={setAuthor}
                options={[
                  { value: ALL, label: 'All authors' },
                  ...distinct((r) => r.author).map((a) => ({
                    value: a,
                    label: a,
                  })),
                ]}
              />
              <Select
                label="Filter by type"
                labelHidden
                size="sm"
                value={type}
                onChange={setType}
                options={[
                  { value: ALL, label: 'All types' },
                  ...distinct((r) => r.type).map((t) => ({
                    value: t,
                    label: t,
                  })),
                ]}
              />
            </Stack>
          )}
          {shown.length === 0 ? (
            <Text as="p" size="sm" tone="muted">
              {rows.length === 0
                ? 'No annotations yet.'
                : 'No annotations match these filters.'}
            </Text>
          ) : (
            <Stack as="ul" gap="2" aria-label="Annotations">
              {shown.map((r) => (
                <Row key={r.key} row={r} ctx={ctx} all={rows} />
              ))}
            </Stack>
          )}
        </Stack>
      </InspectorSection>
      <StyleSection />
    </Stack>
  );
}
