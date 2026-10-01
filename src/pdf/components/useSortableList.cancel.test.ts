import { describe, expect, it, vi } from 'vitest';

const useSortable = vi.fn((opts: unknown) => {
  void opts;
  return () => {};
});
vi.mock('@arshad-shah/detent-react', () => ({ useSortable }));

describe('useSortableList', () => {
  it('never starts a pointer drag from nested form controls or links', async () => {
    const { useSortableList, DRAG_CANCEL } = await import('./useSortableList');
    useSortableList([], () => {});
    const opts = useSortable.mock.calls[0][0] as { cancel?: string };
    expect(opts.cancel).toBe(DRAG_CANCEL);
    for (const sel of ['input', 'textarea', 'select', 'button', 'a'])
      expect(DRAG_CANCEL).toContain(sel);
    expect(DRAG_CANCEL).toContain('[contenteditable');
  });
});
