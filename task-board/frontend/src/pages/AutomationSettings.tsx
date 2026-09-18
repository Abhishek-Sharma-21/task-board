import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToastStore } from '../components/common/toastStore';
import { useConfirmStore } from '../components/common/confirmStore';
import { Plus, Trash2, Power, PowerOff, Zap } from 'lucide-react';

interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  trigger: string;
  conditions: any;
  actions: any;
  enabled: boolean;
}

const TRIGGER_OPTIONS = [
  { value: 'task.moved', label: 'Task Moved to Column' },
  { value: 'task.created', label: 'Task Created' },
  { value: 'task.assigned', label: 'Task Assigned' },
];

const ACTION_OPTIONS = [
  { value: 'moveToColumn', label: 'Move to Column' },
  { value: 'setPriority', label: 'Set Priority' },
  { value: 'markComplete', label: 'Mark as Complete' },
  { value: 'addLabel', label: 'Add Label' },
];

export const AutomationSettings: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'task.moved',
    actionType: 'moveToColumn',
    actionValue: '',
  });

  const fetchRules = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/workspaces/${workspaceId}/automation-rules`);
      setRules(res.data.data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleCreate = async () => {
    if (!newRule.name.trim() || !workspaceId) return;
    try {
      const conditions: any = {};
      const actions: any = {};
      if (newRule.actionType === 'moveToColumn') actions.moveToColumn = newRule.actionValue;
      else if (newRule.actionType === 'setPriority') actions.setPriority = newRule.actionValue;
      else if (newRule.actionType === 'markComplete') actions.markComplete = true;
      else if (newRule.actionType === 'addLabel') actions.addLabel = newRule.actionValue;

      await api.post(`/workspaces/${workspaceId}/automation-rules`, {
        name: newRule.name.trim(),
        trigger: newRule.trigger,
        conditions,
        actions,
      });
      useToastStore.getState().addToast({ message: 'Rule created!', type: 'success' });
      setShowCreate(false);
      setNewRule({ name: '', trigger: 'task.moved', actionType: 'moveToColumn', actionValue: '' });
      fetchRules();
    } catch (err: any) {
      useToastStore.getState().addToast({ message: err.response?.data?.message || 'Failed to create rule', type: 'error' });
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await api.put(`/automation-rules/${rule.id}`, { enabled: !rule.enabled });
      fetchRules();
    } catch (err) {
      useToastStore.getState().addToast({ message: 'Failed to toggle rule', type: 'error' });
    }
  };

  const deleteRule = async (ruleId: string) => {
    const confirmed = await useConfirmStore.getState().open({
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this automation rule?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/automation-rules/${ruleId}`);
      useToastStore.getState().addToast({ message: 'Rule deleted', type: 'success' });
      fetchRules();
    } catch (err) {
      useToastStore.getState().addToast({ message: 'Failed to delete rule', type: 'error' });
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-black uppercase text-text-primary flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Automation Rules
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-mono font-bold uppercase py-2 px-4 rounded-sm transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New Rule
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface border border-border p-4 rounded-sm space-y-3">
          <input
            type="text"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            placeholder="RULE NAME..."
            className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary focus:outline-none focus:border-primary rounded-sm uppercase"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-mono text-text-muted mb-1">When</label>
              <select
                value={newRule.trigger}
                onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary rounded-sm"
              >
                {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-mono text-text-muted mb-1">Action</label>
              <select
                value={newRule.actionType}
                onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary rounded-sm"
              >
                {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-mono text-text-muted mb-1">Value</label>
              <input
                type="text"
                value={newRule.actionValue}
                onChange={(e) => setNewRule({ ...newRule, actionValue: e.target.value })}
                placeholder={newRule.actionType === 'markComplete' ? 'N/A' : 'COLUMN NAME...'}
                disabled={newRule.actionType === 'markComplete'}
                className="w-full bg-input border border-border text-xs font-mono py-2 px-3 text-text-primary rounded-sm disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs font-mono font-bold uppercase text-text-muted border border-border rounded-sm">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newRule.name.trim()}
              className="px-3 py-1.5 text-xs font-mono font-bold uppercase bg-primary text-white rounded-sm hover:bg-primary-hover disabled:opacity-50"
            >
              Create Rule
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs font-mono text-text-muted text-center py-8">Loading rules...</div>
      ) : rules.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center rounded-sm">
          <Zap className="w-8 h-8 text-text-faint mx-auto mb-2" />
          <p className="text-xs font-mono text-text-muted">No automation rules yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className={`flex items-center justify-between p-3 bg-surface border border-border rounded-sm ${!rule.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <Zap className={`w-4 h-4 ${rule.enabled ? 'text-primary' : 'text-text-faint'}`} />
                <div>
                  <h4 className="text-xs font-bold uppercase text-text-primary">{rule.name}</h4>
                  <p className="text-[10px] font-mono text-text-muted">
                    When <span className="text-primary">{rule.trigger}</span> →{' '}
                    {Object.entries(rule.actions as any).map(([k, v]) => (
                      <span key={k}><span className="text-primary">{k}</span>: {String(v)}</span>
                    ))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleRule(rule)} className="text-text-muted hover:text-primary transition-colors" title={rule.enabled ? 'Disable' : 'Enable'}>
                  {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteRule(rule.id)} className="text-text-muted hover:text-danger transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
