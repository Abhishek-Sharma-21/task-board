import React from 'react';

export const InitialLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-page text-text-primary font-sans flex flex-col items-center justify-center space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-sm font-black text-2xl text-white shadow-lg">
          F
        </div>
        <span className="text-lg font-black tracking-widest text-text-primary uppercase font-sans">
          ForgeBoard
        </span>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-mono tracking-wider text-text-secondary">
            LOADING...
          </span>
        </div>
        <p className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
          Preparing your workspace
        </p>
      </div>
    </div>
  );
};
