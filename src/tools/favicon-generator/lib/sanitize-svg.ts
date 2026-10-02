import { ToolError } from '@/shared/lib/errors';

const XLINK = 'http://www.w3.org/1999/xlink';
const DROP_ELEMENTS = new Set(['script', 'foreignobject']);
const EXTERNAL_URL = /url\(\s*['"]?\s*(?!#|data:)[^)]/i;

const safeHref = (v: string) => {
  const t = v.trim().toLowerCase();
  return t.startsWith('#') || t.startsWith('data:image/');
};

/**
 * In-house SVG sanitiser for favicon sources: removes `script` and
 * `foreignObject`, event-handler attributes, any `href` or `xlink:href`
 * that is not a fragment or a data image, and `<style>` blocks that import
 * or load external URLs. Returns the cleaned SVG and what was removed.
 */
export function sanitizeSvg(text: string): { svg: string; removed: string[] } {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (
    doc.getElementsByTagName('parsererror').length > 0 ||
    root.localName !== 'svg'
  )
    throw new ToolError('INVALID_INPUT', 'This is not a valid SVG file');
  const removed: string[] = [];

  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      const name = child.localName.toLowerCase();
      if (DROP_ELEMENTS.has(name)) {
        removed.push(`<${child.localName}> element`);
        child.remove();
        continue;
      }
      if (
        name === 'style' &&
        (/@import/i.test(child.textContent ?? '') ||
          EXTERNAL_URL.test(child.textContent ?? ''))
      ) {
        removed.push('<style> with external resources');
        child.remove();
        continue;
      }
      clean(child);
      walk(child);
    }
  };
  const clean = (el: Element) => {
    for (const attr of [...el.attributes]) {
      const n = attr.localName.toLowerCase();
      if (n.startsWith('on')) {
        removed.push(`${attr.name} attribute`);
        el.removeAttributeNode(attr);
      } else if (
        n === 'href' &&
        (attr.namespaceURI === null || attr.namespaceURI === XLINK) &&
        !safeHref(attr.value)
      ) {
        removed.push(`external link (${attr.value})`);
        el.removeAttributeNode(attr);
      } else if (n === 'style' && EXTERNAL_URL.test(attr.value)) {
        removed.push('style attribute with external resources');
        el.removeAttributeNode(attr);
      }
    }
  };
  clean(root);
  walk(root);
  return { svg: new XMLSerializer().serializeToString(doc), removed };
}
