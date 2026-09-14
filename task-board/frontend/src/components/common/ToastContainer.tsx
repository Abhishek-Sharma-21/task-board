import React from 'react';
import { useToastStore } from './toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full font-mono text-xs pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        let borderClass = 'border-border bg-surface-elevated text-text-primary';
        if (isSuccess) borderClass = 'border-success/40 bg-surface-elevated text-text-primary';
        if (isError) borderClass = 'border-danger/40 bg-surface-elevated text-text-primary';
        if (isWarning) borderClass = 'border-warning/40 bg-surface-elevated text-text-primary';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border-2 ${borderClass} p-3 rounded-sm shadow-theme-xl flex items-center justify-between gap-3 animate-slide-in-up`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-bold uppercase tracking-wider text-[11px] truncate">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {toast.undoAction && (
                <button
                  onClick={() => {
                    toast.undoAction!();
                    removeToast(toast.id);
                  }}
                  className="bg-primary hover:bg-primary-hover text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-xs transition-colors"
                >
                  UNDO
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-text-muted hover:text-text-primary text-sm font-bold leading-none px-1"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
