import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  /** Optional page title displayed at the top */
  title?: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Optional action button(s) rendered in the header row */
  actions?: React.ReactNode;
  /** Max width constraint (default: none / full width) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to include default padding (default: true) */
  padded?: boolean;
  /** Whether to add top spacing (default: true) */
  topSpacing?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  maxWidth,
  padded = true,
  topSpacing = true,
}) => {
  return (
    <div className={`${padded ? 'p-4 sm:p-6 md:p-8 lg:p-12' : ''} ${topSpacing ? 'pt-6 sm:pt-8' : ''} ${maxWidth ? maxWidthClasses[maxWidth] + ' mx-auto' : 'w-full'} animate-fade-in`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            {title && (
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-text-primary">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs font-mono text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
