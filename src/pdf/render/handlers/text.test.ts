import { describe, expect, it, vi } from 'vitest';

const page = {
  getTextContent: vi.fn(),
  cleanup: vi.fn(),
};
vi.mock('./state', () => ({
  getDoc: () => ({ getPage: async () => page }),
}));

const { textHandlers } = await import('./text');
const ctx = {} as never;

describe('text handlers', () => {
  it('free the page resources after reading text, also on failure', async () => {
    page.getTextContent.mockResolvedValueOnce({ items: [], styles: {} });
    await textHandlers.textItems(ctx, 'd', 0);
    expect(page.cleanup).toHaveBeenCalledTimes(1);

    page.getTextContent.mockResolvedValueOnce({ items: [] });
    await textHandlers.extractText(ctx, 'd', 0);
    expect(page.cleanup).toHaveBeenCalledTimes(2);

    page.getTextContent.mockRejectedValueOnce(new Error('broken'));
    await expect(textHandlers.textItems(ctx, 'd', 0)).rejects.toThrow();
    expect(page.cleanup).toHaveBeenCalledTimes(3);
  });
});
