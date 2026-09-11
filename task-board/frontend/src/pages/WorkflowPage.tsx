import React from 'react';

const STEPS = [
  {
    num: '01',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    title: 'Create Task',
    desc: 'Add the work that needs to be done.',
  },
  {
    num: '02',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: 'Assign Task',
    desc: 'Assign it to the responsible team member.',
  },
  {
    num: '03',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Work on Task',
    desc: 'The team member works on the task.',
  },
  {
    num: '04',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8" />
      </svg>
    ),
    title: 'Update Status',
    desc: 'Move the task through the Kanban workflow.',
  },
  {
    num: '05',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Collaborate',
    desc: 'Discuss progress through task comments.',
  },
  {
    num: '06',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    title: 'Complete Task',
    desc: 'Move the task to completion.',
  },
];

export const WorkflowPage: React.FC = () => {
  return (
    <div className="py-8 space-y-12">
      <div className="text-center space-y-2">
        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">
          WORKFLOW
        </span>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-text-primary leading-none">
          How Work Flows in TaskBoard
        </h1>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-0 md:gap-0 flex-wrap md:flex-nowrap">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div className="flex flex-col items-center text-center w-36 shrink-0 gap-2.5 px-2 py-4">
              <div className="w-10 h-10 rounded-sm border border-border bg-surface flex items-center justify-center text-primary shrink-0">
                {step.icon}
              </div>

              <span className="text-[10px] font-mono tracking-widest text-text-muted font-bold">
                {step.num}
              </span>

              <span className="text-xs font-black uppercase tracking-wider text-text-primary leading-snug">
                {step.title}
              </span>

              <p className="text-[11px] text-text-secondary leading-snug font-medium">
                {step.desc}
              </p>
            </div>

            {idx < STEPS.length - 1 && (
              <>
                <span className="hidden md:flex items-center text-text-muted shrink-0 select-none text-lg px-1">
                  →
                </span>
                <span className="flex md:hidden items-center text-text-muted select-none text-lg py-0.5">
                  ↓
                </span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      <p className="text-center text-[10px] font-mono text-text-muted uppercase tracking-widest">
        Repeat the cycle · Ship faster · Stay in sync
      </p>
    </div>
  );
};
