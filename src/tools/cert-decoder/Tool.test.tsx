/** @vitest-environment jsdom */
import { Toaster } from '@arshad-shah/cynosure';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CertDecoder from './Tool';
import { sampleChainPem } from './lib/sample';

const renderTool = () =>
  render(
    <MemoryRouter>
      <Toaster>
        <CertDecoder />
      </Toaster>
    </MemoryRouter>,
  );

const input = () => screen.getByRole('textbox', { name: 'PEM or base64 DER' });

describe('CertDecoder', () => {
  it('starts empty', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: 'No certificate yet' }),
    ).toBeTruthy();
  });

  it('decodes a pasted chain and checks each link', async () => {
    renderTool();
    fireEvent.change(input(), { target: { value: await sampleChainPem() } });
    expect(
      await screen.findByText('Chain of 3 certificates', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByText('Certificate 1 of 3')).toBeTruthy();
    expect(screen.getAllByText('Signature valid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Self-signed').length).toBeGreaterThan(0);
    // One notice per certificate says it, not a badge as well.
    expect(screen.getAllByText(/^Expires in (89|90) days$/).length).toBe(3);
  });

  it('offers Try an example once, in the empty state', () => {
    renderTool();
    expect(
      screen.getAllByRole('button', { name: 'Try an example' }),
    ).toHaveLength(1);
  });

  it('says what is wrong with bad input', async () => {
    renderTool();
    fireEvent.change(input(), { target: { value: 'not base64 at all!' } });
    expect(
      await screen.findByRole('heading', { name: 'Nothing to decode' }),
    ).toBeTruthy();
    expect(screen.getByText(/not valid base64/)).toBeTruthy();
  });
});
