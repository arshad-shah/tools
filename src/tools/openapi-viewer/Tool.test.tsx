/** @vitest-environment jsdom */
import { Text, Toaster } from '@arshad-shah/cynosure';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HANDOFF_PARAM, putHandoff, takeHandoff } from '@/shared/lib/handoff';
import { SAMPLE_OPENAPI } from './lib/samples';
import OpenApiViewer from './Tool';

beforeEach(() => localStorage.clear());
afterEach(() => window.history.replaceState(null, '', '/'));

function Landing() {
  const loc = useLocation();
  return <Text>{`landed ${loc.pathname}${loc.search}`}</Text>;
}

const renderTool = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/web/openapi${search}`]}>
      <Toaster>
        <Routes>
          <Route path="/web/openapi" element={<OpenApiViewer />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Toaster>
    </MemoryRouter>,
  );

describe('OpenApiViewer', () => {
  it('loads the example, groups endpoints and filters them', async () => {
    renderTool();
    expect(screen.getByRole('heading', { name: 'No API yet' })).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Try an example' })[0],
    );
    expect(
      await screen.findByRole('heading', { name: 'Pet Store' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'pets' })).toBeTruthy();
    expect(screen.getByText('6 operations in 3 groups')).toBeTruthy();
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Filter endpoints' }),
      {
        target: { value: 'avatar' },
      },
    );
    expect(screen.getByText('1 of 6 operations match')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'pets' })).toBeNull();
  });

  it('opens an operation and sends it to the HTTP Client as curl', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/yaml',
      text: SAMPLE_OPENAPI,
      sourceTool: 'json-and-xml-viewer',
    });
    await act(async () => {
      renderTool(`?${HANDOFF_PARAM}=${id}`);
    });
    await screen.findByRole('heading', { name: 'Pet Store' });
    fireEvent.click(
      screen.getByRole('button', { name: /POST\s*\/pets\s*Add a pet/ }),
    );
    expect(
      screen.getByRole('heading', { name: 'Request body (required)' }),
    ).toBeTruthy();
    expect(screen.getAllByText('category.parent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Category (circular)').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole('button', { name: 'Send to HTTP Client' }),
    );
    const landed = (await screen.findByText(/^landed /)).textContent ?? '';
    expect(landed).toMatch(/^landed \/web\/http-client\?handoff=/);
    const payload = takeHandoff(
      new URLSearchParams(landed.split('?')[1]).get(HANDOFF_PARAM) ?? '',
    );
    expect(payload).toMatchObject({ kind: 'text', mime: 'application/x-curl' });
    expect(payload?.kind === 'text' && payload.text).toMatch(
      /^curl https:\/\/eu\.api\.example\.com\/v1\/pets \\/,
    );
  });

  it('says why a document cannot be read', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/json',
      text: '{"name": "not an api"}',
      sourceTool: 'test',
    });
    await act(async () => {
      renderTool(`?${HANDOFF_PARAM}=${id}`);
    });
    expect(
      await screen.findByText(/no "openapi" or "swagger" field/),
    ).toBeTruthy();
  });
});
