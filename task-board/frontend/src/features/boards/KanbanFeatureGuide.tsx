import React from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';

export const KanbanFeatureGuide: React.FC = () => {
  return (
    <div className="mt-10 border-t-2 border-border pt-8 space-y-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Handling Many Tasks in a Column */}
        <div className="bg-surface-elevated border border-border p-4 rounded-sm space-y-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <h4 className="text-xs font-black uppercase tracking-tight text-text-primary">
              Handling Many Tasks in a Column
            </h4>
          </div>
          <ul className="space-y-2 text-[11px] text-text-secondary leading-snug">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Each column becomes scrollable when tasks exceed the visible area.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>The column header shows the total count (e.g. Todo 18, In Progress 12).</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>You can quickly search, filter or sort to find specific tasks without scrolling endlessly.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Managing Done Tasks */}
        <div className="bg-surface-elevated border border-border p-4 rounded-sm space-y-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <h4 className="text-xs font-black uppercase tracking-tight text-text-primary">
              Managing Done Tasks
            </h4>
          </div>
          <ul className="space-y-2 text-[11px] text-text-secondary leading-snug">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Done column shows completed tasks with strikethrough text and a green check icon.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>You can keep it as a single column or use a collapsible view to save space.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Optionally, auto-hide old completed tasks with full task history retrieval.</span>
            </li>
          </ul>
        </div>

        {/* Card 3: Column Management */}
        <div className="bg-surface-elevated border border-border p-4 rounded-sm space-y-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <h4 className="text-xs font-black uppercase tracking-tight text-text-primary">
              Column Management
            </h4>
          </div>
          <ul className="space-y-2 text-[11px] text-text-secondary leading-snug">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Add / remove columns based on your custom team workflow.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Drag & drop to reorder columns seamlessly.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Toggle visibility to keep this board clean (e.g. hide Done or Backlog when not needed).</span>
            </li>
          </ul>
        </div>

        {/* Card 4: Responsive & Clean Experience */}
        <div className="bg-surface-elevated border border-border p-4 rounded-sm space-y-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              4
            </span>
            <h4 className="text-xs font-black uppercase tracking-tight text-text-primary">
              Responsive & Clean Experience
            </h4>
          </div>
          <ul className="space-y-2 text-[11px] text-text-secondary leading-snug">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Works well on desktop, tablet, and mobile devices.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Minimal, clean design with clear counts and status indicators.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>Keeps the focus on your tasks, not noisy UI.</span>
            </li>
          </ul>
        </div>

        {/* Card 5: Extra Useful Features */}
        <div className="bg-surface-elevated border border-border p-4 rounded-sm space-y-3 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                5
              </span>
              <h4 className="text-xs font-black uppercase tracking-tight text-text-primary">
                Extra Useful Features
              </h4>
            </div>
            <ul className="space-y-2 text-[11px] text-text-secondary leading-snug">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Quick add task button in each column.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Bulk actions & detailed drawer/workspace modal views.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Real-time WebSockets updates & notifications.</span>
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-sm flex items-start space-x-2 mt-2">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-muted leading-tight font-mono">
              With these features, your board remains organized, fast and easy to use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
