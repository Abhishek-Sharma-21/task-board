import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToastStore } from './common/toastStore';
import { LayoutGrid, Bug, Megaphone, Kanban, Sparkles } from 'lucide-react';

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  columns: string[];
  labels: string[];
}

const BUILTIN_TEMPLATES: TemplateDef[] = [
  {
    id: 'software-sprint',
    name: 'Software Engineering Sprint',
    description: 'Agile sprint board with standard development workflow',
    icon: '💻',
    columns: ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Testing', 'Done'],
    labels: ['feature', 'bug', 'chore', 'tech-debt'],
  },
  {
    id: 'marketing-launch',
    name: 'Marketing Launch',
    description: 'Campaign planning and execution workflow',
    icon: '📢',
    columns: ['Ideas', 'Planning', 'Creative', 'Review', 'Launched', 'Done'],
    labels: ['campaign', 'content', 'design', 'social'],
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    description: 'Track and resolve bugs systematically',
    icon: '🐛',
    columns: ['Reported', 'Triaged', 'In Progress', 'Verified', 'Closed'],
    labels: ['critical', 'regression', 'ui', 'backend'],
  },
  {
    id: 'personal-kanban',
    name: 'Personal Kanban',
    description: 'Simple personal task management',
    icon: '📋',
    columns: ['Backlog', 'Today', 'Doing', 'Done'],
    labels: [],
  },
];

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ isOpen, onClose, onProjectCreated }) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!selectedTemplate || !projectName.trim() || !workspaceId) return;
    setIsCreating(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects/from-template`, {
        templateId: selectedTemplate,
        name: projectName.trim(),
      });
      const { project, board } = res.data.data;
      useToastStore.getState().addToast({ message: 'Project created from template!', type: 'success' });
      onClose();
      if (onProjectCreated) onProjectCreated();
      navigate(`/workspaces/${workspaceId}/projects/${project.id}/boards/${board.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create project';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const template = BUILTIN_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-border rounded-sm shadow-theme-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-black uppercase text-text-primary">Create from Template</h2>
            <p className="text-xs text-text-muted mt-1">Choose a template to quickly set up your project</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {!selectedTemplate ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUILTIN_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className="text-left p-4 border border-border rounded-sm hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <h3 className="text-sm font-black uppercase text-text-primary group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-[11px] text-text-muted mt-1">{t.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.columns.map((c) => (
                      <span key={c} className="text-[8px] font-mono font-bold uppercase bg-surface-active px-1.5 py-0.5 rounded-xs text-text-muted">
                        {c}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setSelectedTemplate(null); setProjectName(''); }} className="text-xs text-primary font-mono font-bold uppercase">
                &larr; Back to templates
              </button>
              {template && (
                <div className="bg-surface border border-border p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{template.icon}</span>
                    <h3 className="text-sm font-black uppercase text-text-primary">{template.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.columns.map((c) => (
                      <span key={c} className="text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                  {template.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.labels.map((l) => (
                        <span key={l} className="text-[9px] font-mono uppercase bg-surface-active px-1.5 py-0.5 rounded-xs text-text-muted">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-text-muted mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="MY AWESOME PROJECT"
                  className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm uppercase"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {selectedTemplate && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-mono font-bold uppercase text-text-muted hover:text-text-primary border border-border rounded-sm">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!projectName.trim() || isCreating}
              className="px-4 py-2 text-xs font-mono font-bold uppercase bg-primary text-white rounded-sm hover:bg-primary-hover disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
