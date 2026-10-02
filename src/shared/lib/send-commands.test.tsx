/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryCommands, resetCommandsForTests } from './commands';
import { SEND_GROUP, useSendCommands } from './send-commands';

afterEach(() => resetCommandsForTests());

function Harness({ run, enabled }: { run: () => void; enabled?: boolean }) {
  useSendCommands('demo-source', [{ target: 'csv-viewer', run, enabled }]);
  return null;
}

const sendCommands = () =>
  queryCommands('Send result')
    .filter((g) => g.group === SEND_GROUP)
    .flatMap((g) => g.commands);

describe('useSendCommands', () => {
  it('lists a "Send result to <tool>" command that runs the handler', () => {
    const run = vi.fn();
    render(<Harness run={run} />);
    const cmd = sendCommands().find(
      (c) => c.label === 'Send result to CSV Viewer & Converter',
    );
    expect(cmd).toBeDefined();
    expect(cmd?.group).toBe('Send result to');
    expect(cmd?.disabled).toBe(false);
    void cmd?.run();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('marks the command disabled while enabled is false', () => {
    const run = vi.fn();
    render(<Harness run={run} enabled={false} />);
    const cmd = sendCommands().find(
      (c) => c.label === 'Send result to CSV Viewer & Converter',
    );
    expect(cmd?.disabled).toBe(true);
    void cmd?.run();
    expect(run).not.toHaveBeenCalled();
  });
});
