/**
 * Test helper: 2D contexts that record what was drawn (imported by tests
 * only). `recordingContext` keeps every call with the style in force at the
 * time; `nullContext` records nothing, for timing the painter itself.
 */

export interface DrawCall {
  name: string;
  args: unknown[];
  fillStyle: string;
  strokeStyle: string;
  font: string;
  lineWidth: number;
}

const STATE = {
  fillStyle: '',
  strokeStyle: '',
  font: '10px sans-serif',
  lineWidth: 1,
  globalAlpha: 1,
  lineJoin: 'miter',
  lineCap: 'butt',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  imageSmoothingEnabled: true,
};

const pxOf = (font: string) => {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? parseFloat(m[1]) : 10;
};

function makeContext(record: boolean) {
  const calls: DrawCall[] = [];
  const state: Record<string, unknown> = { ...STATE };
  const stack: Record<string, unknown>[] = [];
  const target = {
    calls,
    canvas: { width: 0, height: 0 },
    save: () => stack.push({ ...state }),
    restore: () => Object.assign(state, stack.pop() ?? {}),
    measureText: (text: string) => ({
      width: text.length * 0.6 * pxOf(state.font as string),
    }),
    /** Every text drawn, in order. */
    texts: () =>
      calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]),
  };
  return new Proxy(target as typeof target & CanvasRenderingContext2D, {
    get(t, prop: string) {
      if (prop in t) return (t as unknown as Record<string, unknown>)[prop];
      if (prop in state) return state[prop];
      return (...args: unknown[]) => {
        if (record)
          calls.push({
            name: prop,
            args,
            fillStyle: state.fillStyle as string,
            strokeStyle: state.strokeStyle as string,
            font: state.font as string,
            lineWidth: state.lineWidth as number,
          });
      };
    },
    set(_t, prop: string, value) {
      state[prop] = value;
      return true;
    },
  });
}

export type RecordingContext = ReturnType<typeof makeContext>;

export const recordingContext = () => makeContext(true);
export const nullContext = () => makeContext(false);
