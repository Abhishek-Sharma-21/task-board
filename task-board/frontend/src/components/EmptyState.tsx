import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => (
  <div className="border border-dashed border-border rounded-sm p-8 md:p-12 text-center space-y-4 bg-surface/50">
    {icon && <div className="flex justify-center text-text-muted">{icon}</div>}
    <div className="space-y-1">
      <h4 className="text-base font-black uppercase text-text-primary">{title}</h4>
      <p className="text-xs text-text-muted font-medium max-w-sm mx-auto">{description}</p>
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 bg-primary text-white text-xs font-mono font-bold uppercase rounded-sm hover:bg-primary-hover transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
