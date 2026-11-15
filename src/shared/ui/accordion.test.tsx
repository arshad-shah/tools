/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';

const sections = (type?: 'single' | 'multiple') => (
  <Accordion type={type} defaultValue="a">
    <AccordionItem value="a">
      <AccordionTrigger>First</AccordionTrigger>
      <AccordionContent>First body</AccordionContent>
    </AccordionItem>
    <AccordionItem value="b">
      <AccordionTrigger>Second</AccordionTrigger>
      <AccordionContent>Second body</AccordionContent>
    </AccordionItem>
  </Accordion>
);

const expanded = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-expanded');

describe('Accordion', () => {
  it('single: opening one closes the other, and the open one can close', () => {
    render(sections());
    expect(expanded('First')).toBe('true');
    expect(expanded('Second')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(expanded('First')).toBe('false');
    expect(expanded('Second')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(expanded('Second')).toBe('false');
  });

  it('multiple: sections open independently', () => {
    render(sections('multiple'));
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(expanded('First')).toBe('true');
    expect(expanded('Second')).toBe('true');
  });
});
