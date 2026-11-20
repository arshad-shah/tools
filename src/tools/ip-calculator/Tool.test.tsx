/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import IpCalculator from './Tool';

beforeEach(() => localStorage.clear());

const field = (name: string) =>
  screen.getByLabelText(name, { selector: 'input,textarea' }) as
    | HTMLInputElement
    | HTMLTextAreaElement;

const tab = (name: string) =>
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Calculator' })).getByText(
      name,
    ),
  );

describe('IpCalculator', () => {
  it('describes the sample network', () => {
    render(<IpCalculator />);
    const details = screen.getByLabelText('Subnet details');
    expect(within(details).getByText('192.168.1.255')).toBeTruthy();
    expect(within(details).getByText('255.255.255.0')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    expect(screen.getByText('1.168.192.in-addr.arpa')).toBeTruthy();
  });

  it('shows IPv6 counts and errors under the input', () => {
    render(<IpCalculator />);
    fireEvent.change(field('Address and prefix'), {
      target: { value: '2001:db8::/64' },
    });
    expect(
      screen.getAllByText('18,446,744,073,709,551,616 (2 to the power 64)')
        .length,
    ).toBeGreaterThan(0);
    fireEvent.change(field('Address and prefix'), {
      target: { value: '10.0.0.01/24' },
    });
    expect(screen.getByText(/leading zero/)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Nothing to calculate' }),
    ).toBeTruthy();
  });

  it('offers the examples in one menu, and clears', () => {
    render(<IpCalculator />);
    fireEvent.click(screen.getByRole('button', { name: 'Try an example' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: '2001:db8:abcd:12::1/64' }),
    );
    expect(field('Address and prefix').value).toBe('2001:db8:abcd:12::1/64');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(field('Address and prefix').value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('splits, plans and summarises', () => {
    render(<IpCalculator />);
    tab('Split and plan');
    expect(screen.getByText('4 subnets of /18')).toBeTruthy();
    expect(screen.getByText('10.0.192.0/18')).toBeTruthy();
    fireEvent.click(screen.getByText('VLSM'));
    expect(screen.getByText('192.168.0.0/25')).toBeTruthy();
    fireEvent.click(screen.getByText('Summarise and overlaps'));
    expect(screen.getByText('10.0.0.0/22')).toBeTruthy();
    expect(screen.getAllByText(/10.0.1.0\/24 \(line 2\) contains/).length).toBe(
      1,
    );
  });

  it('converts addresses and checks ranges', () => {
    render(<IpCalculator />);
    tab('Address tools');
    expect(screen.getByText('3232235777')).toBeTruthy();
    expect(screen.getByText('In the range')).toBeTruthy();
    fireEvent.change(field('Is this address in the range?'), {
      target: { value: '10.0.0.30' },
    });
    expect(screen.getByText('Not in the range')).toBeTruthy();
  });
});
