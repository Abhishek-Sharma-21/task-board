import React from 'react';
import { Plus, User, Settings, List, MessageSquare, Check } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: <Plus className="w-5 h-5" />,
    title: 'Create Task',
    desc: 'Add the work that needs to be done.',
  },
  {
    num: '02',
    icon: <User className="w-5 h-5" />,
    title: 'Assign Task',
    desc: 'Assign it to the responsible team member.',
  },
  {
    num: '03',
    icon: <Settings className="w-5 h-5" />,
    title: 'Work on Task',
    desc: 'The team member works on the task.',
  },
  {
    num: '04',
    icon: <List className="w-5 h-5" />,
    title: 'Update Status',
    desc: 'Move the task through the Kanban workflow.',
  },
  {
    num: '05',
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Collaborate',
    desc: 'Discuss progress through task comments.',
  },
  {
    num: '06',
    icon: <Check className="w-5 h-5" />,
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
