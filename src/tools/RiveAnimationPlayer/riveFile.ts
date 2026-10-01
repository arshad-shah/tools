import { ToolError } from '@/shared/lib/errors';

// Every .riv file starts with the ASCII fingerprint "RIVE"; the runtime
// rejects anything else with "Bad header".
const SIG = [0x52, 0x49, 0x56, 0x45];

export function assertRiveFile(name: string, bytes: Uint8Array): void {
  if (!SIG.every((b, i) => bytes[i] === b))
    throw new ToolError('INVALID_FILE', `${name} is not a Rive (.riv) file`);
}
