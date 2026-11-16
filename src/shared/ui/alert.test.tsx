/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { IconTrendingUp } from './icons';

describe('Alert', () => {
  it('a danger alert is announced as an alert with its title and message', () => {
    render(
      <Alert status="danger">
        <AlertTitle>Upload failed</AlertTitle>
        <AlertDescription>The file is too large.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Upload failed');
    expect(alert.textContent).toContain('The file is too large.');
  });

  it('other statuses are polite status messages', () => {
    render(<Alert status="warning">Check the input.</Alert>);
    expect(screen.getByRole('status').textContent).toContain(
      'Check the input.',
    );
  });

  it('keeps id and data attributes for references and tests', () => {
    render(
      <Alert status="danger" id="err" data-error-code="TOO_LARGE">
        Too large.
      </Alert>,
    );
    const host = document.getElementById('err')!;
    expect(host.getAttribute('data-error-code')).toBe('TOO_LARGE');
    expect(host.textContent).toContain('Too large.');
  });
});

describe('Alert icon', () => {
  const pathsOf = (el: Element) =>
    [...el.querySelectorAll('path')].map((p) => p.getAttribute('d'));

  it("draws a kit icon as the Notice's own icon", () => {
    render(<Alert icon={<IconTrendingUp />}>Up this week.</Alert>);
    const svg = screen.getByRole('status').querySelector('.cy-notice-icon')!;
    expect(pathsOf(svg)).toEqual(
      IconTrendingUp.data.body.map(([, a]) => ('d' in a ? a.d : null)),
    );
  });

  it("any other node shows the status's icon; none shows no icon", () => {
    const { rerender } = render(
      <Alert icon={<span data-testid="x" />}>Note.</Alert>,
    );
    expect(
      screen.getByRole('status').querySelector('.cy-notice-icon'),
    ).not.toBeNull();
    expect(screen.queryByTestId('x')).toBeNull();
    rerender(<Alert>Note.</Alert>);
    expect(
      screen.getByRole('status').querySelector('.cy-notice-icon'),
    ).toBeNull();
  });
});
