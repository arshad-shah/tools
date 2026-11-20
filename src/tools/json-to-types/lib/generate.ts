import type { LanguageId } from '@/shared/editor';
import { ToolError } from '@/shared/lib/errors';
import { emitCSharp } from './emit/csharp';
import { emitGo } from './emit/go';
import { emitJsonSchema } from './emit/json-schema';
import { emitKotlin } from './emit/kotlin';
import { emitPython } from './emit/python';
import { emitRust } from './emit/rust';
import { DEFAULT_EMIT, type Emitter, type EmitOptions } from './emit/shared';
import { emitTypeScript } from './emit/typescript';
import { emitZod } from './emit/zod';
import { inferModel, type InferOptions } from './infer';
import type { TypeModel } from './model';
import { parseInput } from './parse-input';

export type TargetId =
  | 'typescript'
  | 'zod'
  | 'json-schema'
  | 'go'
  | 'rust'
  | 'python'
  | 'kotlin'
  | 'csharp';

interface TargetInfo {
  label: string;
  /** File extension, without the dot. */
  ext: string;
  mime: string;
  /** The editor's highlighting for the output. */
  editor: LanguageId;
  emit: Emitter;
}

export const TARGETS: Record<TargetId, TargetInfo> = {
  typescript: {
    label: 'TypeScript',
    ext: 'ts',
    mime: 'text/typescript',
    editor: 'ts',
    emit: emitTypeScript,
  },
  zod: {
    label: 'Zod',
    ext: 'ts',
    mime: 'text/typescript',
    editor: 'ts',
    emit: emitZod,
  },
  'json-schema': {
    label: 'JSON Schema',
    ext: 'schema.json',
    mime: 'application/schema+json',
    editor: 'json',
    emit: emitJsonSchema,
  },
  go: {
    label: 'Go',
    ext: 'go',
    mime: 'text/x-go',
    editor: 'plain',
    emit: emitGo,
  },
  rust: {
    label: 'Rust (serde)',
    ext: 'rs',
    mime: 'text/x-rust',
    editor: 'plain',
    emit: emitRust,
  },
  python: {
    label: 'Python',
    ext: 'py',
    mime: 'text/x-python',
    editor: 'plain',
    emit: emitPython,
  },
  kotlin: {
    label: 'Kotlin',
    ext: 'kt',
    mime: 'text/x-kotlin',
    editor: 'plain',
    emit: emitKotlin,
  },
  csharp: {
    label: 'C#',
    ext: 'cs',
    mime: 'text/x-csharp',
    editor: 'plain',
    emit: emitCSharp,
  },
};

export const TARGET_IDS = Object.keys(TARGETS) as TargetId[];

export const isTargetId = (v: unknown): v is TargetId =>
  typeof v === 'string' && Object.hasOwn(TARGETS, v);

export interface GenerateOptions extends InferOptions, EmitOptions {
  target: TargetId;
  /** A top-level array is a list of samples of the root type. */
  arrayAsSamples: boolean;
}

export const DEFAULT_GENERATE: GenerateOptions = {
  target: 'typescript',
  rootName: 'Root',
  detectDates: true,
  arrayAsSamples: false,
  ...DEFAULT_EMIT,
};

export interface Generated {
  code: string;
  model: TypeModel;
  /** How many samples were merged. */
  samples: number;
}

/** The samples in parsed documents (one per document, or array items). */
export function samplesOf(
  documents: unknown[],
  arrayAsSamples: boolean,
): unknown[] {
  if (arrayAsSamples && documents.length === 1 && Array.isArray(documents[0]))
    return documents[0];
  return documents;
}

/** Parses `text` and emits types for the target; null for empty input. */
export function generate(
  text: string,
  opts: GenerateOptions,
): Generated | null {
  const { documents } = parseInput(text);
  if (!documents.length) return null;
  const samples = samplesOf(documents, opts.arrayAsSamples);
  try {
    const model = inferModel(samples, opts);
    return {
      code: TARGETS[opts.target].emit(model, opts),
      model,
      samples: samples.length,
    };
  } catch (e) {
    if (e instanceof RangeError)
      throw new ToolError(
        'TOO_LARGE',
        'This JSON is nested too deeply to infer types',
        {
          cause: e,
        },
      );
    throw e;
  }
}
