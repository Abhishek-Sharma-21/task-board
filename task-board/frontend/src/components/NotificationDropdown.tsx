import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../features/notifications/notificationStore';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onToggle,
  notifications,
  unreadCount,
  isLoading,
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative text-text-muted hover:text-text-primary transition-colors focus:outline-none flex items-center justify-center p-1"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary text-white rounded-full flex items-center justify-center text-[8px] font-bold font-mono px-1 border border-header">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-surface-elevated border border-border rounded-sm shadow-theme-xl z-50 overflow-hidden font-sans max-w-[calc(100vw-2rem)]">
          <div className="p-3 border-b border-border flex justify-between items-center bg-surface-hover">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-text-muted">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[9px] uppercase font-mono text-primary hover:text-primary-hover font-bold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
            {isLoading && notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted font-mono">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted font-mono italic">
                No notifications found
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) onMarkAsRead(n.id);
                    if (n.link) navigate(n.link);
                    onClose();
                  }}
                  className={`p-3 text-left transition-colors cursor-pointer ${
                    n.read ? 'bg-transparent hover:bg-surface-hover' : 'bg-notification-unread hover:bg-notification-unread-hover'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-xs font-bold text-text-primary leading-tight">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-normal mb-1">
                    {n.message}
                  </p>
                  <span className="text-[8px] font-mono text-text-faint block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
