import { useEffect } from 'react';

/** Keep keyboard and screen-reader interaction inside the currently open dialog. */
export function useDialogAccessibility() {
  useEffect(() => {
    let active = null;
    let trigger = null;
    let lastOutside = document.activeElement;
    let overflow = '';
    let backgrounds = [];
    const selector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
    const controls = () => active ? [...active.querySelectorAll(selector)].filter(el => el.getClientRects().length && !el.closest('[inert]')) : [];
    const release = () => {
      backgrounds.forEach(([el, wasInert]) => { el.inert = wasInert; });
      backgrounds = [];
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    const update = () => {
      const next = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].at(-1) || null;
      if (next === active) return;
      if (active) { active = null; release(); }
      active = next;
      if (!active) return;
      trigger = document.activeElement?.closest('[role="dialog"]') ? lastOutside : document.activeElement;
      overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const outside = new Set();
      for (let node = active; node && node.id !== 'app'; node = node.parentElement) {
        if (!node.parentElement) break;
        for (const sibling of node.parentElement.children) {
          if (sibling !== node && sibling instanceof HTMLElement) outside.add(sibling);
        }
      }
      backgrounds = [...outside].map(el => [el, el.inert]);
      backgrounds.forEach(([el]) => { el.inert = true; });
      active.tabIndex = -1;
      const initial = active.querySelector('input:not([type="hidden"]),select,textarea') || controls()[0] || active;
      initial.focus({ preventScroll: true });
    };
    const keydown = e => {
      if (!active || e.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { e.preventDefault(); active.focus(); return; }
      const first = items[0], last = items.at(-1);
      if (!active.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === active)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === active)) { e.preventDefault(); first.focus(); }
    };
    const focusin = e => {
      if (active && !active.contains(e.target)) (controls()[0] || active).focus();
      else if (!active && !e.target.closest('[role="dialog"]')) lastOutside = e.target;
    };
    const observer = new MutationObserver(update);
    observer.observe(document.getElementById('app'), { childList: true, subtree: true });
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      if (active) { active = null; release(); }
    };
  }, []);
}
