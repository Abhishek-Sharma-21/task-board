import React, { useEffect } from 'react';
import { Spinner } from './Spinner';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-sm p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        <div className="space-y-2">
          <h3 id="confirmation-modal-title" className="text-lg font-black uppercase text-text-primary">
            {title}
          </h3>
          <p className="text-xs text-text-secondary font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2 border-t border-border">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono font-bold uppercase text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase rounded-sm text-white flex items-center space-x-2 transition-colors ${
              isDangerous
                ? 'bg-danger hover:bg-danger/90'
                : 'bg-primary hover:bg-primary-hover'
            } disabled:opacity-50`}
          >
            {isLoading && <Spinner size="sm" className="mr-1.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
