/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import KeypairGenerator from './Tool';

beforeEach(() => localStorage.clear());

const renderTool = () =>
  render(
    <MemoryRouter>
      <KeypairGenerator />
    </MemoryRouter>,
  );

describe('KeypairGenerator', () => {
  it('starts empty, with the local-only warning', () => {
    renderTool();
    expect(screen.getByText('No key pair yet')).toBeTruthy();
    expect(screen.getByText('Generated on this device')).toBeTruthy();
    expect(screen.getByLabelText('OpenSSH comment')).toBeTruthy();
  });

  it('generates an Ed25519 pair with every export and fingerprints', async () => {
    renderTool();
    fireEvent.change(screen.getByLabelText('OpenSSH comment'), {
      target: { value: 'me@host' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Generate key pair' })[0],
    );
    expect(await screen.findByText('Private key (PKCS#8 PEM)')).toBeTruthy();
    expect(screen.getByText('OpenSSH public key')).toBeTruthy();
    expect(screen.getByText(/^ssh-ed25519 \S+ me@host$/)).toBeTruthy();
    expect(
      screen.getByText(/^256 SHA256:\S+ me@host \(ED25519\)$/),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Download all as ZIP' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Download openssh public key as id_ed25519.pub',
      }),
    ).toBeTruthy();
  });
});
