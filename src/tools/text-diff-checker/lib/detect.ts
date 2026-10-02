import { LANGUAGES, type LanguageId } from '@/shared/lib/syntax/tokenize';

/**
 * The CodeSurface language for a diff side: from the file name when there
 * is one, else sniffed from the first lines. `plain` when unsure.
 */
export function detectLanguage(text: string, name?: string): LanguageId {
  const ext = name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const byExt = ext && LANGUAGES.find((l) => l.extensions.includes(ext));
  if (byExt) return byExt.id;
  const head = text.slice(0, 2000).trimStart();
  if (head === '') return 'plain';
  if (/^[[{]/.test(head)) {
    try {
      JSON.parse(text);
      return 'json';
    } catch {
      // Not JSON; keep sniffing.
    }
  }
  if (/^<\?xml|^<[a-zA-Z][\w:-]*[\s>]/.test(head))
    return /^<!doctype html|^<html/i.test(head) ? 'html' : 'xml';
  if (/^<!doctype html/i.test(head)) return 'html';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|WITH|ALTER)\b/i.test(head))
    return 'sql';
  if (/^#{1,6} \S/m.test(head) && /^(#|[-*] |\d+\. |```)/m.test(head))
    return 'markdown';
  if (/^(import|export|const|let|function|class)\b/m.test(head)) return 'js';
  if (/^---\s*$|^[\w-]+:\s/m.test(head) && !/[;{}]/.test(head)) return 'yaml';
  return 'plain';
}
