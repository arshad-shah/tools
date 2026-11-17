/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { editorValue, setEditorValue } from '@/shared/editor/testing';
import { emptyRequest, type HttpRequest } from '../lib/model';
import { BodyTab } from './BodyTab';

function Harness({ initial }: { initial: HttpRequest }) {
  const [request, setRequest] = useState(initial);
  return <BodyTab request={request} onChange={setRequest} />;
}

const jsonRequest = (text: string) =>
  emptyRequest({
    method: 'POST',
    body: { ...emptyRequest().body, kind: 'json', text },
  });

describe('BodyTab', () => {
  it('edits the JSON body in a code editor and marks where it breaks', async () => {
    const { container } = render(<Harness initial={jsonRequest('{}')} />);
    const editor = screen.getByRole('textbox', { name: 'JSON body' });
    setEditorValue(editor, '{\n  "a": 1,\n}');
    expect(editorValue(editor)).toBe('{\n  "a": 1,\n}');
    expect(screen.getByText(/^Line 3, column 1: /)).toBeTruthy();
    await waitFor(() =>
      expect(container.querySelector('.cm-lint-marker-error')).not.toBeNull(),
    );
    setEditorValue(editor, '{"a": 1}');
    expect(screen.queryByText(/^Line \d+, column/)).toBeNull();
  });
});
