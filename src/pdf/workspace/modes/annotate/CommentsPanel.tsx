import { useMemo, useState } from 'react';
import {
  Button,
  Input,
  InspectorSection,
  Label,
  Select,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { IconReply, IconTrash } from '@/shared/ui/icons';
import { currentAuthor } from '@/pdf/doc/ops';
import type { ModeProps } from '../types';
import { relativeTime } from '../../relative-time';
import { commentRows, type CommentRow } from './comments-rows';
import { useAllExisting } from './existing';
import { getAnnotateUi, setAnnotateUi, useAnnotateUi } from './ui-store';

const ALL = '';

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
    <Stack gap="1">
      <Label htmlFor="annotate-author">Your name for comments</Label>
      <Input
        id="annotate-author"
        value={value}
        maxLength={200}
        onChange={(v) => setDraft({ base: author, value: v })}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    </Stack>
  );
}

/** Colour, opacity and width moved to the toolbar's Style control (P5-D). */
function StyleSection() {
  const ui = useAnnotateUi();
  return (
    <InspectorSection title="Display">
      <Stack gap="3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="annotate-hide">Hide existing annotations</Label>
          <Switch
            id="annotate-hide"
            checked={ui.hideExisting}
            onCheckedChange={(hideExisting) => setAnnotateUi({ hideExisting })}
          />
        </div>
      </Stack>
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
    <li
      className="border-b border-line py-2 last:border-b-0"
      data-testid="comment-row"
    >
      <Stack gap="1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <Text size="sm" weight="medium">
            {row.author}
          </Text>
          <Text size="xs" tone="muted">
            {row.type}, page {row.pageNumber}
            {row.at !== null ? (
              <span data-dynamic>, {relativeTime(row.at)}</span>
            ) : null}
          </Text>
        </div>
        {parent ? (
          <Text size="xs" tone="muted">
            Reply to {parent.author}
          </Text>
        ) : null}
        {row.text ? <Text size="sm">{row.text}</Text> : null}
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={() => goTo(ctx, row)}>
            Go to
          </Button>
          {row.replyable ? (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconReply size="sm" />}
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
            leftIcon={<IconTrash size="sm" />}
            onClick={del}
          >
            Delete
          </Button>
        </div>
      </Stack>
    </li>
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
    <div>
      <InspectorSection title="Comments">
        <Stack gap="3">
          <AuthorField ctx={ctx} />
          <div className="grid grid-cols-1 gap-2">
            <Select
              aria-label="Filter by page"
              value={page}
              onValueChange={setPage}
              items={[
                { value: ALL, label: 'All pages' },
                ...[...new Set(rows.map((r) => r.pageNumber))]
                  .sort((a, b) => a - b)
                  .map((n) => ({ value: String(n), label: `Page ${n}` })),
              ]}
            />
            <Select
              aria-label="Filter by author"
              value={author}
              onValueChange={setAuthor}
              items={[
                { value: ALL, label: 'All authors' },
                ...distinct((r) => r.author).map((a) => ({
                  value: a,
                  label: a,
                })),
              ]}
            />
            <Select
              aria-label="Filter by type"
              value={type}
              onValueChange={setType}
              items={[
                { value: ALL, label: 'All types' },
                ...distinct((r) => r.type).map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <Text size="sm" tone="muted">
              {rows.length === 0
                ? 'No annotations yet.'
                : 'No annotations match these filters.'}
            </Text>
          ) : (
            <ul aria-label="Annotations" className="m-0 list-none p-0">
              {shown.map((r) => (
                <Row key={r.key} row={r} ctx={ctx} all={rows} />
              ))}
            </ul>
          )}
        </Stack>
      </InspectorSection>
      <StyleSection />
    </div>
  );
}
