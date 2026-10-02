import { describe, expect, it } from 'vitest';
import { stageDocument, takeStagedDocument } from './workspace-store';

describe('workspace store', () => {
  it('hands a staged document over once', () => {
    const bytes = new Uint8Array([1]);
    const id = stageDocument({ name: 'a.pdf', bytes, wasEncrypted: false });
    expect(takeStagedDocument(id)).toEqual({
      id,
      name: 'a.pdf',
      bytes,
      wasEncrypted: false,
    });
    expect(takeStagedDocument(id)).toBeNull();
    expect(takeStagedDocument('nope')).toBeNull();
  });
});
