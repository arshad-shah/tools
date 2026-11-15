/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

describe('Card', () => {
  it('a title-only header becomes the card heading, then body and footer', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle as="h2">Size by format</CardTitle>
          <CardDescription>An estimate.</CardDescription>
        </CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Size by format' }),
    ).toBeTruthy();
    expect(screen.getByText('An estimate.')).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text.indexOf('Body')).toBeLessThan(text.indexOf('Footer'));
  });

  it('keeps a header with other content as content, its title a heading', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
          <span>200 OK</span>
        </CardHeader>
        <CardBody>Body</CardBody>
      </Card>,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Response' }),
    ).toBeTruthy();
    expect(screen.getByText('200 OK')).toBeTruthy();
  });

  it('with onClick is one button, and its actions act on their own', () => {
    const select = vi.fn();
    const remove = vi.fn();
    render(
      <Card
        interactive
        onClick={select}
        aria-current
        actions={
          <button type="button" onClick={remove}>
            Delete
          </button>
        }
      >
        <CardBody>GET users</CardBody>
      </Card>,
    );
    const card = screen.getByRole('button', { name: /GET users/ });
    expect(card.getAttribute('aria-current')).toBe('true');
    fireEvent.click(card);
    expect(select).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
  });
});
