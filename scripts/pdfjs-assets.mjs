import { cp, mkdir, readFile, rename as fsRename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** pdfjs-dist folders the app loads at runtime from /pdfjs/. */
export const PDFJS_ASSET_DIRS = ['standard_fonts', 'cmaps', 'iccs', 'wasm'];

const STAMP = '.version';

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const isCurrent = async (destDir, version) => {
  try {
    if ((await readFile(join(destDir, STAMP), 'utf8')).trim() !== version) {
      return false;
    }
  } catch {
    return false;
  }
  for (const dir of PDFJS_ASSET_DIRS) {
    if (!(await exists(join(destDir, dir)))) return false;
  }
  return true;
};

const copyAssets = async (srcDir, targetDir) => {
  for (const dir of PDFJS_ASSET_DIRS) {
    await cp(join(srcDir, dir), join(targetDir, dir), {
      recursive: true,
      force: true,
    });
  }
};

/** Best-effort removal: a folder another process still holds is left behind. */
const tryRemove = (path) =>
  rm(path, { recursive: true, force: true }).catch(() => undefined);

/**
 * Keep `destDir` a copy of the pdf.js runtime assets for `version`.
 *
 * - Skips all work when `destDir/.version` already matches (the common case on
 *   every `pnpm dev` / `pnpm build`), so a dev server already serving the
 *   folder never sees it change.
 * - Otherwise copies into a fresh folder under `workDir` and swaps it in with
 *   two renames. If the live folder cannot be renamed (Windows EBUSY/EPERM
 *   while another process holds a file), it overwrites in place instead;
 *   nothing in use is ever deleted.
 *
 * @returns {Promise<'copied' | 'skipped'>}
 */
export async function syncPdfjsAssets({
  srcDir,
  destDir,
  workDir,
  version,
  rename = fsRename,
}) {
  if (await isCurrent(destDir, version)) return 'skipped';

  const id = `${process.pid}-${Date.now()}`;
  const fresh = join(workDir, `fresh-${id}`);
  const old = join(workDir, `old-${id}`);
  await mkdir(workDir, { recursive: true });
  await copyAssets(srcDir, fresh);
  await writeFile(join(fresh, STAMP), version);

  try {
    if (await exists(destDir)) await rename(destDir, old);
    try {
      await rename(fresh, destDir);
    } catch (error) {
      // Put the previous copy back before falling through to the in-place path.
      if (await exists(old)) await rename(old, destDir).catch(() => undefined);
      throw error;
    }
  } catch {
    await mkdir(destDir, { recursive: true });
    await copyAssets(srcDir, destDir);
    await writeFile(join(destDir, STAMP), version);
  }

  await tryRemove(fresh);
  await tryRemove(old);
  return 'copied';
}
