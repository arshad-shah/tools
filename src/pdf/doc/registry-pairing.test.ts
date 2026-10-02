import { describe, expect, it } from 'vitest';
import { ALL_RUNNERS } from './checkpoints';
import {
  getCheckpointRunner,
  registerCheckpointRunners,
} from './checkpoints/registry';
import { ALL_MATERIALIZERS } from './materialize';
import { getMaterializer, registerMaterializers } from './materialize/registry';
import { registerCoreOperations } from './ops';
import { allOperations } from './registry';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);
registerCheckpointRunners(ALL_RUNNERS);

describe('registry pairing', () => {
  it('structure ops are page-map ops that arrangePages writes', () => {
    for (const op of allOperations().filter((o) => o.kind === 'structure'))
      expect(op.type, op.type).toMatch(/^page\./);
  });

  it('every overlay op with output has a writer', () => {
    for (const op of allOperations().filter(
      (o) => o.kind === 'overlay' && !o.noOutput,
    ))
      expect(getMaterializer(op.type), op.type).toBeDefined();
  });

  it('every checkpoint op has a runner', () => {
    for (const op of allOperations().filter((o) => o.kind === 'checkpoint'))
      expect(() => getCheckpointRunner(op.type), op.type).not.toThrow();
  });

  it('every structure and overlay op folds into the view', () => {
    for (const op of allOperations().filter((o) => o.kind !== 'checkpoint'))
      expect(op.applyToView, op.type).toBeTypeOf('function');
  });
});
