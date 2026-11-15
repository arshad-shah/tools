/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { notify, resetNotifyForTests } from '@/shared/lib/notify';
import { Toaster } from './toaster';

afterEach(() => resetNotifyForTests());

describe('Toaster', () => {
  it('draws Facet icons through Cynosure, never sonner', async () => {
    render(<Toaster />);
    act(() => void notify.success('Saved 3 files'));
    await screen.findByText('Saved 3 files');
    expect(document.querySelector('[data-sonner-toaster]')).toBeNull();
    expect(document.querySelector('.cy-toast svg')).not.toBeNull();
  });
});
