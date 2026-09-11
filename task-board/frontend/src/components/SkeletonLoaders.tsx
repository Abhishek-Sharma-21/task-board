import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-surface border border-border p-6 rounded-sm space-y-3 animate-pulse">
    <div className="h-3 bg-border rounded-xs w-1/3"></div>
    <div className="h-8 bg-border rounded-xs w-1/2"></div>
    <div className="h-3 bg-border rounded-xs w-2/3"></div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse p-4">
    <div className="h-8 bg-border rounded-xs w-full"></div>
    <div className="h-8 bg-border rounded-xs w-full"></div>
    <div className="h-8 bg-border rounded-xs w-full"></div>
  </div>
);

export const BoardColumnSkeleton: React.FC = () => (
  <div className="w-[280px] sm:w-[300px] shrink-0 bg-sidebar border border-border rounded-sm p-4 space-y-4 animate-pulse">
    <div className="h-4 bg-border rounded-xs w-1/2"></div>
    <div className="h-24 bg-border rounded-xs w-full"></div>
    <div className="h-24 bg-border rounded-xs w-full"></div>
  </div>
);
