/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { protectionOf } from '@/pdf/doc/ops/protect';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { DocumentApi, ModeProps } from '../types';
import { PermissionsForm } from './PermissionsForm';

beforeAll(() => registerCoreOperations());

function setup(restricted = false) {
  const model = makeModel(makeState(1, { restricted }));
  const props = (): ModeProps => ({
    doc: {
      view: model.getView(),
      state: model.getState(),
      dispatch: (op) => model.dispatch(op),
    } as DocumentApi,
    selection: {} as ModeProps['selection'],
    tool: { id: null, set: () => {} },
    layout: 'standard',
  });
  const view = render(<PermissionsForm {...props()} />);
  const rerender = () => view.rerender(<PermissionsForm {...props()} />);
  return { model, rerender };
}

describe('PermissionsForm', () => {
  it('turns protection on as one op holding permissions, never a password', () => {
    const { model, rerender } = setup();
    const copy = screen.getByRole('checkbox', {
      name: 'Allow copying text and images',
    });
    expect(copy.hasAttribute('disabled')).toBe(true);
    fireEvent.click(
      screen.getByRole('switch', { name: 'Password protection' }),
    );
    rerender();
    expect(protectionOf(model.getView())?.enabled).toBe(true);
    expect(
      screen.getByText(
        'You choose the password when you export. It is never saved.',
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Allow copying text and images' }),
    );
    rerender();
    const last = model.getState().log.at(-1)!;
    expect(last.type).toBe('protect.set');
    expect(Object.keys(last.params as object).sort()).toEqual([
      'enabled',
      'permissions',
    ]);
    expect(protectionOf(model.getView())?.permissions.copy).toBe(true);
  });

  it('comments imply form filling', () => {
    setup();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Password protection' }),
    );
    expect(
      screen.getByText('Included when comments are allowed.'),
    ).toBeTruthy();
  });

  it('a restricted document cannot change protection', () => {
    setup(true);
    expect(
      screen
        .getByRole('switch', { name: 'Password protection' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});
