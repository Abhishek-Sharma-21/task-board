import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCommentStore } from './commentStore';
import { useAuthStore } from '../auth/authStore';
import { getSocket } from '../../sockets/socket';

interface CommentSectionProps {
  taskId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
  const { boardId } = useParams<{ boardId: string }>();
  const comments = useCommentStore((state) => state.commentsByTask[taskId] || []);
  const isLoading = useCommentStore((state) => state.isLoading);
  const fetchComments = useCommentStore((state) => state.fetchComments);
  const addComment = useCommentStore((state) => state.addComment);
  const currentUser = useAuthStore((state) => state.user);

  const [commentBody, setCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId -> name

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  useEffect(() => {
    if (taskId) {
      fetchComments(taskId);
    }
  }, [taskId, fetchComments]);

  useEffect(() => {
    if (!boardId || !currentUser) return;
    const socket = getSocket();

    const handleUserTyping = (data: { taskId: string; userId: string; name: string }) => {
      if (data.taskId === taskId && data.userId !== currentUser.id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.name }));
      }
    };

    const handleUserStoppedTyping = (data: { taskId: string; userId: string }) => {
      if (data.taskId === taskId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);

    return () => {
      stopTypingImmediate();
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
    };
  }, [boardId, taskId, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentBody(e.target.value);

    if (!boardId || !currentUser) return;
    const socket = getSocket();

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      socket.emit('typing', { boardId, taskId, name: currentUser.name });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      socket.emit('stopTyping', { boardId, taskId });
    }, 1500);
  };

  const stopTypingImmediate = () => {
    if (isCurrentlyTypingRef.current && boardId) {
      const socket = getSocket();
      socket.emit('stopTyping', { boardId, taskId });
      isCurrentlyTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || isSubmitting) return;
    setIsSubmitting(true);
    stopTypingImmediate();
    try {
      await addComment(taskId, commentBody.trim());
      setCommentBody('');
    } catch (err) {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (dateStr: Date | string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).toUpperCase();
  };

  const typingNames = Object.values(typingUsers);

  return (
    <div className="space-y-6 pt-6 border-t border-border">
      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted">
        DISCUSSION ({comments.length})
      </h4>

      {/* Write Comment Form */}
      <form onSubmit={handlePostComment} className="space-y-3">
        <textarea
          rows={3}
          value={commentBody}
          onChange={handleInputChange}
          placeholder="ADD TO THE DISCUSSION..."
          className="w-full bg-input border-2 border-border rounded-sm py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-primary placeholder-text-faint resize-none"
        />
        <div className="flex justify-between items-center">
          {/* Typing Indicator */}
          <div className="text-[10px] font-mono text-text-muted italic uppercase tracking-wider">
            {typingNames.length > 0 && (
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse"></span>
                <span>
                  {typingNames.length === 1
                    ? `${typingNames[0]} is typing...`
                    : `${typingNames.join(', ')} are typing...`}
                </span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!commentBody.trim() || isSubmitting}
            className="bg-primary hover:bg-primary-hover disabled:bg-surface-active disabled:text-text-faint text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-sm transition-colors border border-transparent disabled:border-border"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Feed list */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {isLoading && comments.length === 0 ? (
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-faint italic">
            Syncing comments...
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isMe = comment.user.id === currentUser?.id;
            return (
              <div
                key={comment.id}
                className="flex items-start space-x-3 border border-border p-3 bg-surface-hover rounded-sm"
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-surface-active border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary font-mono shrink-0">
                  {getInitials(comment.user.name)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-tight truncate">
                      {comment.user.name} {isMe && <span className="text-[9px] text-primary font-mono font-normal">(YOU)</span>}
                    </span>
                    <span className="text-[8px] font-mono text-text-faint tracking-widest shrink-0">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-medium leading-relaxed break-words whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-faint italic text-center py-6">
            No comments yet. Start the conversation.
          </div>
        )}
      </div>
    </div>
  );
};
