import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../sockets/socket';
import { ChevronUp, ChevronDown, Activity } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  userName: string;
  timestamp: Date;
}

export const ActivityFeedWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const handleActivity = useCallback((data: { action: string; description: string; userName: string }) => {
    const entry: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action: data.action,
      description: data.description,
      userName: data.userName,
      timestamp: new Date(),
    };
    setActivities((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('activity:new', handleActivity);
    return () => { socket.off('activity:new', handleActivity); };
  }, [handleActivity]);

  const formatTime = (d: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {isOpen && (
        <div className="mb-2 w-80 max-h-96 bg-surface-elevated border border-border rounded-sm shadow-theme-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-sidebar">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-primary" />
              Live Activity Feed
            </span>
            <span className="text-[9px] font-mono text-text-muted">{activities.length} events</span>
          </div>
          <div className="overflow-y-auto max-h-80 p-2 space-y-1">
            {activities.length === 0 ? (
              <div className="text-[10px] font-mono text-text-muted text-center py-6 italic">
                No activity yet. Actions will appear here in real-time.
              </div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="px-2 py-1.5 rounded-xs hover:bg-surface-hover transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] text-text-secondary leading-tight">
                      <span className="font-bold text-text-primary">{a.userName}</span>{' '}
                      {a.description}
                    </p>
                    <span className="text-[8px] font-mono text-text-faint shrink-0">{formatTime(a.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-sm shadow-theme-lg hover:bg-primary-hover transition-colors font-mono text-[10px] font-bold uppercase tracking-wider"
      >
        <Activity className="w-3.5 h-3.5" />
        Activity
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
    </div>
  );
};
