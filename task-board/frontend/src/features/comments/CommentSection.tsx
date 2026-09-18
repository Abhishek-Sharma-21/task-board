import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCommentStore } from './commentStore';
import { useAuthStore } from '../auth/authStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { useConfirmStore } from '../../components/common/confirmStore';
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

  const workspaceMembers = useWorkspaceStore((state) => state.members);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentBody(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (!/\s/.test(query)) {
        setMentionQuery(query.toLowerCase());
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }

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

  const handleSelectMention = (member: { id: string; name: string }) => {
    const lastAtIndex = commentBody.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newText = `${commentBody.slice(0, lastAtIndex)}@${member.name} `;
      setCommentBody(newText);
    }
    setMentionQuery(null);
  };

  const matchingMembers = mentionQuery !== null
    ? workspaceMembers.filter((m: { id: string; name: string; role: string }) => m.name.toLowerCase().includes(mentionQuery))
    : [];

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

  const renderCommentBodyWithMentions = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_. -]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="font-mono font-bold text-primary bg-primary/10 px-1 rounded-xs">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const typingNames = Object.values(typingUsers);

  const updateComment = useCommentStore((state) => state.updateComment);
  const deleteComment = useCommentStore((state) => state.deleteComment);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const handleStartEdit = (comment: { id: string; body: string }) => {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingBody.trim()) return;
    try {
      await updateComment(taskId, commentId, editingBody.trim());
      setEditingCommentId(null);
    } catch (err) {
      // Handled
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await useConfirmStore.getState().open({
      title: 'Confirm',
      message: 'Delete this comment?',
      confirmLabel: 'Confirm',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteComment(taskId, commentId);
    } catch (err) {
      // Handled
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-border">
      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted">
        DISCUSSION ({comments.length})
      </h4>

      {/* Write Comment Form */}
      <form onSubmit={handlePostComment} className="space-y-3 relative">
        <textarea
          rows={3}
          value={commentBody}
          onChange={handleInputChange}
          placeholder="ADD TO THE DISCUSSION (TYPE @ TO MENTION A TEAMMATE)..."
          className="w-full bg-input border-2 border-border rounded-sm py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-primary placeholder-text-faint resize-none"
        />

        {/* Mention Suggestions Popover */}
        {mentionQuery !== null && matchingMembers.length > 0 && (
          <div className="absolute bottom-12 left-0 w-64 bg-surface border border-border shadow-xl rounded-sm max-h-40 overflow-y-auto z-50 p-1 font-mono text-xs">
            <div className="text-[9px] uppercase tracking-wider text-text-muted px-2 py-1 border-b border-border">
              Mention Team Member
            </div>
            {matchingMembers.map((m) => (
              <div
                key={m.id}
                onClick={() => handleSelectMention(m)}
                className="px-2 py-1.5 hover:bg-primary hover:text-white cursor-pointer rounded-xs flex items-center justify-between"
              >
                <span>{m.name}</span>
                <span className="text-[9px] opacity-75 uppercase">{m.role}</span>
              </div>
            ))}
          </div>
        )}

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
            const isEditing = editingCommentId === comment.id;

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
                    <div className="flex items-center space-x-2">
                      <span className="text-[8px] font-mono text-text-faint tracking-widest shrink-0">
                        {formatTimestamp(comment.createdAt)}
                      </span>
                      {isMe && !isEditing && (
                        <div className="flex items-center space-x-1 font-mono text-[9px]">
                          <button
                            onClick={() => handleStartEdit(comment)}
                            className="text-text-muted hover:text-primary uppercase"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-text-muted hover:text-danger uppercase"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        rows={2}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        className="w-full bg-input border border-border rounded-sm p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                      />
                      <div className="flex space-x-2 font-mono text-[9px]">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="bg-primary text-white px-2 py-1 rounded-sm font-bold uppercase"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="bg-surface-active text-text-muted px-2 py-1 rounded-sm uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted font-medium leading-relaxed break-words whitespace-pre-wrap">
                      {renderCommentBodyWithMentions(comment.body)}
                    </p>
                  )}
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
