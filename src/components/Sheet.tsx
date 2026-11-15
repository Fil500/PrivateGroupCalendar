import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Bottom-Sheet auf dem Smartphone, zentrierter Dialog ab md. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[92dvh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 md:max-w-lg md:animate-pop-in md:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="flex min-w-[5.5rem] justify-start">{left}</div>
      <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{title}</h2>
      <div className="flex min-w-[5.5rem] justify-end">{right}</div>
    </div>
  );
}

export function SheetBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
      {children}
    </div>
  );
}

export const textButton =
  'rounded-lg px-1 py-1 text-[15px] text-rose-600 transition hover:text-rose-700 disabled:opacity-40 dark:text-rose-400';

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h3>
      {action}
    </div>
  );
}

/** iOS-artige gruppierte Liste */
export function Group({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-xl bg-slate-100 dark:divide-slate-700/70 dark:bg-slate-800">
      {children}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-h-[3rem] items-center justify-between gap-3 px-4 py-2">
      <span className="text-[15px]">{label}</span>
      {children}
    </label>
  );
}

export const fieldInput =
  'rounded-lg bg-white px-2.5 py-1.5 text-base tabular-nums outline-none ring-rose-400 focus:ring-2 dark:bg-slate-700';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}
