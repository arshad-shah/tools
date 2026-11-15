/**
 * jsdom has neither the Popover API nor `<dialog>.showModal()`, and its
 * default stylesheet hides every `[popover]` (`:popover-open` never
 * matches). Cynosure's overlays (Tooltip, Popover, Menu, HoverCard, Dialog,
 * Sheet) are built on both, so tests get a small stand-in: a shown popover
 * drops its `popover` attribute while open (so jsdom's stylesheet no longer
 * hides it) and `:popover-open` answers from the shown set. Browsers (e2e)
 * use the real thing.
 */
const shown = new WeakSet<Element>();
const SAVED = 'data-jsdom-popover';

export function installOverlayPolyfills(): void {
  if (typeof HTMLElement === 'undefined') return;
  const proto = HTMLElement.prototype as HTMLElement & {
    showPopover?: () => void;
    hidePopover?: () => void;
    togglePopover?: (force?: boolean) => boolean;
  };
  if (!proto.showPopover) {
    proto.showPopover = function (this: HTMLElement) {
      if (shown.has(this)) return;
      shown.add(this);
      this.setAttribute(SAVED, this.getAttribute('popover') ?? 'auto');
      this.removeAttribute('popover');
    };
    proto.hidePopover = function (this: HTMLElement) {
      if (!shown.has(this)) return;
      shown.delete(this);
      this.setAttribute('popover', this.getAttribute(SAVED) ?? 'auto');
      this.removeAttribute(SAVED);
    };
    proto.togglePopover = function (this: HTMLElement, force?: boolean) {
      const open = force ?? !shown.has(this);
      if (open) this.showPopover!();
      else this.hidePopover!();
      return open;
    };
    const matches = Element.prototype.matches;
    Element.prototype.matches = function (this: Element, selector: string) {
      if (selector === ':popover-open') return shown.has(this);
      return matches.call(this, selector);
    } as typeof matches;
  }

  // A Cynosure Dialog brings a focused field into view.
  if (!Element.prototype.scrollIntoView)
    Element.prototype.scrollIntoView = function () {};

  if (
    typeof HTMLDialogElement !== 'undefined' &&
    !HTMLDialogElement.prototype.showModal
  ) {
    const dialog = HTMLDialogElement.prototype;
    dialog.show = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    dialog.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      this.setAttribute('aria-modal', 'true');
    };
    dialog.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.removeAttribute('aria-modal');
      // Browsers queue the close event as a task.
      setTimeout(() => this.dispatchEvent(new Event('close')));
    };
  }
}
