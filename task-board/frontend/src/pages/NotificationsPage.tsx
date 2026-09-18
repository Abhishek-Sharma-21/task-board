import React from 'react';
import { useNotificationStore } from '../features/notifications/notificationStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
            {activeWorkspace?.name.toUpperCase() || 'WORKSPACE'}
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">
            NOTIFICATIONS
          </h1>
          <p className="mt-1 text-xs text-text-muted font-mono">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center space-x-2 text-xs font-mono font-bold text-primary hover:text-primary-hover uppercase tracking-wider transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-surface border border-border rounded-sm">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-text-faint mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-text-muted font-mono">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-text-faint mx-auto mb-2" />
            <p className="text-sm font-bold text-text-muted mb-1">No notifications</p>
            <p className="text-xs text-text-muted font-mono">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.read) markAsRead(notification.id);
                  if (notification.link) navigate(notification.link);
                }}
                className={`p-4 cursor-pointer transition-colors ${
                  notification.read
                    ? 'bg-transparent hover:bg-surface-hover'
                    : 'bg-notification-unread hover:bg-notification-unread-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      notification.read ? 'bg-surface-hover' : 'bg-primary/10'
                    }`}>
                      <Bell className={`w-4 h-4 ${notification.read ? 'text-text-muted' : 'text-primary'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-[10px] font-mono text-text-faint mt-1 block">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-hover rounded-sm transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
