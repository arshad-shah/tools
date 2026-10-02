/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { KeepAliveOutlet } from './keep-alive';

function Counter({ name }: { name: string }) {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      {`${name} ${n}`}
    </button>
  );
}

let go: (to: string) => void = () => {};
function Nav() {
  const navigate = useNavigate();
  useEffect(() => {
    go = navigate;
  }, [navigate]);
  return null;
}

const app = (
  <MemoryRouter initialEntries={['/a']}>
    <Nav />
    <Routes>
      <Route element={<KeepAliveOutlet />}>
        <Route path="/a" element={<Counter name="A" />} />
        <Route path="/b" element={<Counter name="B" />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

describe('KeepAliveOutlet', () => {
  it('keeps a page and its state when you come back', () => {
    render(app);
    fireEvent.click(screen.getByRole('button', { name: 'A 0' }));
    expect(screen.getByRole('button', { name: 'A 1' })).toBeTruthy();
    act(() => go('/b'));
    expect(screen.getByRole('button', { name: 'B 0' })).toBeTruthy();
    // The hidden page is out of the accessibility tree.
    expect(screen.queryByRole('button', { name: 'A 1' })).toBeNull();
    act(() => go('/a'));
    expect(screen.getByRole('button', { name: 'A 1' })).toBeTruthy();
  });

  it('mounts fresh when a hand-off arrives', () => {
    render(app);
    fireEvent.click(screen.getByRole('button', { name: 'A 0' }));
    act(() => go('/b'));
    act(() => go('/a?handoff=x'));
    expect(screen.getByRole('button', { name: 'A 0' })).toBeTruthy();
  });
});
