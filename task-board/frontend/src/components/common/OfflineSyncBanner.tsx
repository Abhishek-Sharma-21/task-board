import React, { useState, useEffect } from 'react';
import {
  getPendingOperations,
  removePendingOperation,
} from '../../services/offlineSyncService';
import { api } from '../../api/client';
import { useBoardStore } from '../../features/boards/boardStore';
import { Spinner } from '../Spinner';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFailed, setSyncFailed] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const activeBoard = useBoardStore((state) => state.activeBoard);
  const fetchColumnsAndTasks = useBoardStore((state) => state.fetchColumnsAndTasks);

  const checkPendingCount = async () => {
    const ops = await getPendingOperations();
    setPendingCount(ops.length);
  };

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncFailed(false);

    try {
      const ops = await getPendingOperations();
      for (const op of ops) {
        try {
          if (op.type === 'CREATE_TASK') {
            await api.post(`/boards/${op.payload.boardId}/tasks`, op.payload);
          } else if (op.type === 'UPDATE_TASK') {
            await api.put(`/tasks/${op.payload.id}`, op.payload);
          } else if (op.type === 'MOVE_TASK') {
            await api.put(`/tasks/${op.payload.id}/move`, op.payload);
          } else if (op.type === 'DELETE_TASK') {
            await api.delete(`/tasks/${op.payload.id}`);
          } else if (op.type === 'ARCHIVE_TASK') {
            await api.patch(`/tasks/${op.payload.id}/archive`, { isArchived: op.payload.isArchived });
          }
          await removePendingOperation(op.id);
        } catch (err: any) {
          console.warn(`Sync failed for operation ${op.type}:`, err);
          if (err.response?.status >= 400 && err.response?.status < 500) {
            // Unrecoverable validation / authorization error, remove from queue
            await removePendingOperation(op.id);
          } else {
            setSyncFailed(true);
            break;
          }
        }
      }

      await checkPendingCount();
      if (activeBoard) {
        await fetchColumnsAndTasks(activeBoard.id);
      }
    } catch (err) {
      setSyncFailed(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkPendingCount();

    const interval = setInterval(checkPendingCount, 5000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [activeBoard]);

  if (isOnline && pendingCount === 0 && !syncFailed) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`w-full py-2 px-4 text-xs font-mono flex items-center justify-between transition-colors ${
        !isOnline
          ? 'bg-amber-950/80 text-amber-300 border-b border-amber-800/50'
          : syncFailed
          ? 'bg-red-950/80 text-red-300 border-b border-red-800/50'
          : 'bg-primary/20 text-primary border-b border-primary/30'
      }`}
    >
      <div className="flex items-center space-x-2">
        <span
          className={`w-2 h-2 rounded-full ${
            !isOnline
              ? 'bg-amber-400 animate-pulse'
              : isSyncing
              ? 'bg-blue-400 animate-ping'
              : syncFailed
              ? 'bg-red-400'
              : 'bg-emerald-400'
          }`}
        />
        <span>
          {!isOnline
            ? `OFFLINE MODE — ${pendingCount} operation(s) queued for sync`
            : isSyncing
            ? 'SYNCING QUEUED OFFLINE CHANGES...'
            : syncFailed
            ? 'SYNC FAILED — Some offline changes could not be applied'
            : `ONLINE — ${pendingCount} pending change(s) ready to sync`}
        </span>
      </div>

      {isOnline && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="px-2.5 py-1 bg-surface-active hover:bg-surface-hover text-text-primary text-[10px] uppercase tracking-wider font-bold rounded-sm border border-border transition-colors disabled:opacity-50 flex items-center space-x-1"
        >
          {isSyncing && <Spinner size="sm" />}
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  );
};
