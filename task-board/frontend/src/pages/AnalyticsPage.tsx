import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useProjectStore } from '../features/projects/projectStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Clock, Users, Download } from 'lucide-react';

interface AnalyticsData {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
  projectMetrics: Array<{
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
  }>;
}

interface VelocityData { week: string; completed: number; created: number; }
interface AgingData { taskId: string; title: string; columnName: string; daysInColumn: number; boardName: string; priority: string; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AnalyticsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { projects, fetchProjects } = useProjectStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [aging, setAging] = useState<AgingData[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (workspaceId) fetchProjects(workspaceId); }, [workspaceId, fetchProjects]);

  const loadAnalytics = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const [analyticsRes, agingRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/analytics`),
        api.get(`/workspaces/${workspaceId}/analytics/aging`),
      ]);
      setAnalytics(analyticsRes.data.data);
      setAging(agingRes.data.data);

      if (selectedProject !== 'all') {
        const velRes = await api.get(`/workspaces/${workspaceId}/projects/${selectedProject}/velocity`);
        setVelocity(velRes.data.data);
      } else if (projects.length > 0) {
        const velRes = await api.get(`/workspaces/${workspaceId}/projects/${projects[0].id}/velocity`);
        setVelocity(velRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, selectedProject, projects]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const handleExport = () => {
    if (!analytics) return;
    const csv = [
      'Project,Total Tasks,Completed,Completion %',
      ...analytics.projectMetrics.map(p => `${p.name},${p.totalTasks},${p.completedTasks},${p.completionPercentage}%`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const pieData = analytics ? [
    { name: 'Completed', value: analytics.completedTasks },
    { name: 'In Progress', value: analytics.inProgressTasks },
    { name: 'Pending', value: analytics.pendingTasks },
    { name: 'Overdue', value: analytics.overdueTasks },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-xs font-mono text-text-muted uppercase tracking-widest">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black uppercase text-text-primary flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-input border border-border text-xs font-mono py-1.5 px-3 rounded-sm text-text-primary"
          >
            <option value="all">ALL PROJECTS</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-1 bg-primary text-white text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-sm hover:bg-primary-hover transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks', value: analytics.totalTasks, color: 'text-primary' },
            { label: 'Completed', value: analytics.completedTasks, color: 'text-success' },
            { label: 'In Progress', value: analytics.inProgressTasks, color: 'text-info' },
            { label: 'Overdue', value: analytics.overdueTasks, color: 'text-danger' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-surface border border-border p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider">{kpi.label}</span>
              <p className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        <div className="bg-surface border border-border p-4 rounded-sm">
          <h3 className="text-xs font-mono font-bold uppercase text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Sprint Velocity (8 weeks)
          </h3>
          {velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Bar dataKey="completed" fill="#6366f1" name="Completed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="created" fill="#e5e7eb" name="Created" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-xs font-mono text-text-muted">No velocity data</div>
          )}
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-surface border border-border p-4 rounded-sm">
          <h3 className="text-xs font-mono font-bold uppercase text-text-primary mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Task Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-xs font-mono text-text-muted">No task data</div>
          )}
        </div>
      </div>

      {/* Task Aging */}
      <div className="bg-surface border border-border p-4 rounded-sm">
        <h3 className="text-xs font-mono font-bold uppercase text-text-primary mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Task Aging (Stuck &ge; 3 days)
        </h3>
        {aging.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[9px] tracking-wider">
                  <th className="text-left py-2 px-2">Task</th>
                  <th className="text-left py-2 px-2">Column</th>
                  <th className="text-left py-2 px-2">Board</th>
                  <th className="text-right py-2 px-2">Days Stuck</th>
                  <th className="text-right py-2 px-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {aging.map((t) => (
                  <tr key={t.taskId} className="border-b border-border-subtle hover:bg-surface-hover">
                    <td className="py-2 px-2 text-text-primary font-bold truncate max-w-[200px]">{t.title}</td>
                    <td className="py-2 px-2 text-text-secondary">{t.columnName}</td>
                    <td className="py-2 px-2 text-text-muted">{t.boardName}</td>
                    <td className={`py-2 px-2 text-right font-bold ${t.daysInColumn >= 6 ? 'text-danger' : 'text-warning'}`}>{t.daysInColumn}d</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
                        t.priority === 'Urgent' ? 'bg-danger/15 text-danger' :
                        t.priority === 'High' ? 'bg-warning/15 text-warning' :
                        'bg-surface-active text-text-muted'
                      }`}>{t.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs font-mono text-text-muted">No stuck tasks found</div>
        )}
      </div>

      {/* Project Metrics */}
      {analytics && analytics.projectMetrics.length > 0 && (
        <div className="bg-surface border border-border p-4 rounded-sm">
          <h3 className="text-xs font-mono font-bold uppercase text-text-primary mb-4">Project Completion</h3>
          <div className="space-y-3">
            {analytics.projectMetrics.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-primary w-32 truncate">{p.name}</span>
                <div className="flex-1 bg-border h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${p.completionPercentage}%` }} />
                </div>
                <span className="text-[10px] font-mono text-text-muted w-12 text-right">{p.completionPercentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
