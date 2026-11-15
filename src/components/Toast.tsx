import { useEffect, useRef } from 'react';

export interface ToastState {
  id: number;
  message: string;
  undo?: () => Promise<void>;
}

export default function Toast({ toast, onUndo, onDismiss }: { toast: ToastState; onUndo: () => void; onDismiss: () => void }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-toast-in items-center gap-4 rounded-full bg-slate-900 py-2.5 pl-4 pr-2 text-sm text-white shadow-xl dark:bg-slate-100 dark:text-slate-900"
    >
      <span className="truncate">{toast.message}</span>
      {toast.undo ? (
        <button type="button" onClick={onUndo} className="shrink-0 rounded-full px-3 py-1 font-semibold text-rose-300 hover:bg-white/10 dark:text-rose-600 dark:hover:bg-black/5">
          Rückgängig
        </button>
      ) : (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-full px-2 py-1 opacity-70 hover:opacity-100" aria-label="Schließen">
          ✕
        </button>
      )}
    </div>
  );
}
