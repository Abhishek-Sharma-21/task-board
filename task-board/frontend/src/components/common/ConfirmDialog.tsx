import React from 'react';
import { useConfirmStore } from './confirmStore';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

export const ConfirmDialog: React.FC = () => {
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, close } = useConfirmStore();

  if (!isOpen) return null;

  const iconMap = {
    danger: <Trash2 className="w-6 h-6 text-danger" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning" />,
    info: <Info className="w-6 h-6 text-info" />,
  };

  const confirmBtnMap = {
    danger: 'bg-danger hover:bg-danger/80 text-white',
    warning: 'bg-warning hover:bg-warning/80 text-white',
    info: 'bg-primary hover:bg-primary-hover text-white',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-xs"
        onClick={() => close(false)}
      />
      <div className="relative bg-surface-elevated border border-border rounded-sm shadow-theme-xl w-full max-w-md p-6 space-y-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">{iconMap[variant]}</div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => close(false)}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary border border-border rounded-sm hover:bg-surface-hover transition-colors btn-press"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors btn-press ${confirmBtnMap[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
