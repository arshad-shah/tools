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

describe('HashGenerator', () => {
  it('selecting algorithms updates the results', async () => {
    render(<HashGenerator />);
    typeMessage('abc');
    await waitFor(() =>
      expect(screen.getByTestId('hash-sha256').textContent).toBe(ABC_SHA256),
    );
    expect(screen.queryByTestId('hash-blake3')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'BLAKE3' }));
    await waitFor(() =>
      expect(screen.getByTestId('hash-blake3').textContent).toMatch(
        /^[0-9a-f]{64}$/,
      ),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'SHA-256' }));
    await waitFor(() => expect(screen.queryByTestId('hash-sha256')).toBeNull());
    // Settings persist in the module store: put them back.
    fireEvent.click(screen.getByRole('checkbox', { name: 'SHA-256' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BLAKE3' }));
  });

  it('the verify field names the matching algorithm', async () => {
    render(<HashGenerator />);
    typeMessage('abc');
    await screen.findByTestId('hash-sha256');
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
    await screen.findByTestId('hash-sha256');
    fireEvent.click(screen.getByRole('radio', { name: 'HEX' }));
    expect(screen.getByTestId('hash-sha256').textContent).toBe(
      ABC_SHA256.toUpperCase(),
    );
  });
});
