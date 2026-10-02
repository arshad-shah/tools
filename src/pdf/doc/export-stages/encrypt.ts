import { ToolError } from '@/shared/lib/errors';
import { buildEncryptOptions } from '@/pdf/edit/permissions';
import type { ExportStage } from '../export-stages';
import { protectionOf } from '../ops/protect';

export const SIGN_AND_PROTECT_MESSAGE =
  'A PDF cannot be password-protected and digitally signed in one export. Turn off password protection or remove the signature.';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Password protection (Protect mode, decision G25): applies when
 * `protect.set` is on. The passwords come from the Export dialog
 * (`options.password`, `confirmPassword`, `ownerPassword`) and are never
 * stored; a blank owner password becomes a random one. Refuses alongside a
 * digital signature (decision G14), whichever Part's check runs first.
 */
export const encryptStage: ExportStage = {
  id: 'encrypt',
  order: 30,
  applies: (ctx) => protectionOf(ctx.view)?.enabled === true,
  async run(bytes, ctx) {
    const { options } = ctx;
    if (options.signature)
      throw new ToolError('INVALID_INPUT', SIGN_AND_PROTECT_MESSAGE);
    const protect = protectionOf(ctx.view)!;
    const userPassword = text(options.password);
    const encrypt = buildEncryptOptions(
      {
        userPassword,
        confirmPassword:
          options.confirmPassword === undefined
            ? userPassword
            : text(options.confirmPassword),
        ownerPassword: text(options.ownerPassword),
      },
      protect.permissions,
    );
    const out = await ctx.services.qpdf.encrypt(bytes, encrypt, ctx.signal);
    ctx.warnings.push(...out.warnings);
    if (ctx.options.linearize !== true) return out.bytes;
    // Encryption rewrites the file, undoing fast web view: linearize again
    // with the owner password (qpdf keeps the encryption it reads).
    const lin = await ctx.services.qpdf.optimize(
      out.bytes,
      {
        password: encrypt.ownerPassword,
        linearize: true,
        objectStreams: 'preserve',
        recompressFlate: false,
        removeUnreferenced: false,
      },
      ctx.signal,
    );
    ctx.warnings.push(...lin.warnings);
    return lin.bytes;
  },
};
