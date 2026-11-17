/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageAnnotate from './Tool';

/** A PNG signature and enough bytes to sniff; decoding is stubbed. */
const pngFile = () =>
  new File(
    [
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2,
      ]),
    ],
    'shot.png',
    { type: 'image/png' },
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 400, height: 200, close: () => {} })),
  );
});
afterEach(() => vi.unstubAllGlobals());

const renderTool = () =>
  render(
    <MemoryRouter>
      <ImageAnnotate />
    </MemoryRouter>,
  );

async function openImage() {
  const input = document.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [pngFile()] } });
  return screen.findByRole('img', { name: /shot\.png, 400 by 200 pixels/ });
}

describe('ImageAnnotate', () => {
  it('asks for an image, with a paste button', () => {
    renderTool();
    expect(screen.getByText(/Drop an image here/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paste image' })).toBeTruthy();
  });

  it('opens an image and adds, undoes and redoes an object from the keyboard path', async () => {
    renderTool();
    const stage = await openImage();
    expect(stage.getAttribute('aria-label')).toMatch(/0 objects/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Add arrow in the middle' }),
    );
    expect(stage.getAttribute('aria-label')).toMatch(/1 objects/);
    expect(screen.getByRole('group', { name: 'Arrow 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stage.getAttribute('aria-label')).toMatch(/0 objects/);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(stage.getAttribute('aria-label')).toMatch(/1 objects/);
  });

  it('rotates and crops through the panel fields', async () => {
    renderTool();
    await openImage();
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    expect(screen.getByRole('img', { name: /200 by 400 pixels/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Crop' }));
    expect(screen.getByRole('group', { name: 'Crop area' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apply crop' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply crop' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apply crop' })).toBeNull(),
    );
  });

  it('every drawing tool has a named control', async () => {
    renderTool();
    await openImage();
    for (const name of [
      'Select and move',
      'Arrow',
      'Line',
      'Rectangle',
      'Ellipse',
      'Pen',
      'Text',
      'Numbered step',
      'Highlighter',
      'Blur (redact)',
      'Pixelate (redact)',
    ])
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });
});
