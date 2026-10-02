import { beforeAll, describe, expect, it } from 'vitest';
import { METADATA_FIELDS } from '@/pdf/edit/metadata';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import { makeModel, makeState } from '../test-helpers';
import { registerCoreOperations } from './index';
import {
  metadataOf,
  PROPERTY_FIELDS,
  protectionOf,
  sanitizeDocument,
  setDocumentProperties,
  setProtection,
} from './protect';

beforeAll(() => registerCoreOperations());

const choices = { ...DEFAULT_PERMISSIONS, copy: true };

describe('protect.set', () => {
  it('stores the on/off choice and permissions only, as a document overlay', () => {
    const m = makeModel(makeState(2));
    m.dispatch({
      type: 'protect.set',
      params: { enabled: true, permissions: choices },
    });
    const view = m.getView();
    expect(view.docOverlays).toHaveLength(1);
    expect(protectionOf(view)).toEqual({ enabled: true, permissions: choices });
    expect(m.getState().log[0].label).toBe('Turn on password protection');
  });

  it('the latest choice wins and undo restores the earlier one', () => {
    const m = makeModel(makeState(2));
    m.dispatch({
      type: 'protect.set',
      params: { enabled: true, permissions: choices },
    });
    m.dispatch({
      type: 'protect.set',
      params: { enabled: false, permissions: choices },
    });
    expect(protectionOf(m.getView())?.enabled).toBe(false);
    m.undo();
    expect(protectionOf(m.getView())?.enabled).toBe(true);
  });

  it('never accepts a password in its params', () => {
    const pw = ['pass', 'word'].join('');
    expect(() =>
      setProtection.validate({
        enabled: true,
        permissions: choices,
        [pw]: 'x',
      }),
    ).toThrow('Password protection: passwords are never stored');
    expect(() =>
      setProtection.validate({ enabled: 'yes', permissions: choices }),
    ).toThrow();
    expect(() =>
      setProtection.validate({ enabled: true, permissions: { printing: 'x' } }),
    ).toThrow();
    expect(setProtection.noOutput).toBe(true);
  });
});

describe('meta.set', () => {
  it('knows the same fields as the metadata engine', () => {
    expect(PROPERTY_FIELDS).toEqual(METADATA_FIELDS);
  });

  it('validates fields and folds patches in log order', () => {
    const m = makeModel(makeState(1));
    m.dispatch({ type: 'meta.set', params: { patch: { title: 'A' } } });
    m.dispatch({
      type: 'meta.set',
      params: { patch: { title: 'B', author: 'Ada' } },
    });
    expect(metadataOf(m.getView())).toEqual({
      patch: { title: 'B', author: 'Ada' },
      removeAll: false,
    });
    expect(() =>
      setDocumentProperties.validate({ patch: { colour: 'x' } }),
    ).toThrow('Document properties: unknown field colour');
    expect(() =>
      setDocumentProperties.validate({ patch: { title: 3 } }),
    ).toThrow();
  });

  it('remove all clears earlier patches', () => {
    const m = makeModel(makeState(1));
    m.dispatch({ type: 'meta.set', params: { patch: { title: 'A' } } });
    m.dispatch({ type: 'meta.set', params: { patch: {}, removeAll: true } });
    m.dispatch({ type: 'meta.set', params: { patch: { author: 'Ada' } } });
    expect(metadataOf(m.getView())).toEqual({
      patch: { author: 'Ada' },
      removeAll: true,
    });
    expect(m.getState().log[1].label).toBe('Remove all document properties');
  });
});

describe('sanitize', () => {
  it('needs at least one kind of content', () => {
    const none = {
      scripts: false,
      attachments: false,
      links: false,
      metadata: false,
      hiddenLayers: false,
    };
    expect(() => sanitizeDocument.validate(none)).toThrow(
      'Choose something to remove',
    );
    expect(sanitizeDocument.validate({ ...none, scripts: true })).toEqual({
      ...none,
      scripts: true,
    });
    expect(sanitizeDocument.kind).toBe('checkpoint');
  });
});
