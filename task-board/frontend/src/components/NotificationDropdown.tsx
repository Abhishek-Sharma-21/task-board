import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../features/notifications/notificationStore';
import { parseLocalDate } from '../utils/dates';
import { Bell } from 'lucide-react';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="relative text-text-muted hover:text-text-primary transition-colors focus:outline-none flex items-center justify-center p-1"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
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
                    {parseLocalDate(n.createdAt)}
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
