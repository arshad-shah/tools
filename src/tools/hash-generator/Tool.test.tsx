/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import HashGenerator from './Tool';

const ABC_SHA256 =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

beforeEach(() => localStorage.clear());

const typeMessage = (text: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'Text to hash' }), {
    target: { value: text },
  });
/** A digest's value (its element id is `hash-<id>`). */
const digestOf = (id: string) => document.getElementById(`hash-${id}`);
const findDigest = (id: string) =>
  waitFor(() => {
    const el = digestOf(id);
    if (!el) throw new Error(`no ${id} yet`);
    return el;
  });

describe('HashGenerator', () => {
  it('starts empty, then hashes beside the input with Copy', async () => {
    render(<HashGenerator />);
    expect(screen.getByRole('heading', { name: 'No hashes yet' })).toBeTruthy();
    typeMessage('abc');
    await findDigest('sha256');
    expect(screen.getByRole('button', { name: 'Copy SHA-256' })).toBeTruthy();
  });

  it('selecting algorithms updates the results', async () => {
    render(<HashGenerator />);
    typeMessage('abc');
    await waitFor(() =>
      expect(digestOf('sha256')?.textContent).toBe(ABC_SHA256),
    );
    expect(digestOf('blake3')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Algorithms/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BLAKE3' }));
    await waitFor(() =>
      expect(digestOf('blake3')?.textContent).toMatch(/^[0-9a-f]{64}$/),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'SHA-256' }));
    await waitFor(() => expect(digestOf('sha256')).toBeNull());
    // Settings persist in the module store: put them back.
    fireEvent.click(screen.getByRole('checkbox', { name: 'SHA-256' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BLAKE3' }));
  });

  it('the verify field names the matching algorithm', async () => {
    render(<HashGenerator />);
    typeMessage('abc');
    await findDigest('sha256');
    fireEvent.change(screen.getByLabelText('Expected hash'), {
      target: { value: `SHA256: ${ABC_SHA256.toUpperCase()}` },
    });
    expect(await screen.findByText('Match: SHA-256')).toBeTruthy();
    expect(screen.getAllByText('Broken for security').length).toBeGreaterThan(
      0,
    );
  });

  it('switches the output format', async () => {
    render(<HashGenerator />);
    typeMessage('abc');
    await findDigest('sha256');
    fireEvent.click(screen.getByRole('radio', { name: 'HEX' }));
    expect(digestOf('sha256')?.textContent).toBe(ABC_SHA256.toUpperCase());
    fireEvent.click(screen.getByRole('radio', { name: 'hex' }));
  });
});
