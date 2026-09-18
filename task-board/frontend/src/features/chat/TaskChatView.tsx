import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { Task, TaskChatMessage } from '../../schemas';
import { useTaskChatStore } from './taskChatStore';
import { useAuthStore } from '../auth/authStore';
import { useProjectMemberStore } from '../projects/projectMemberStore';
import { useWorkspaceStore } from '../workspaces/workspaceStore';
import { getSocket } from '../../sockets/socket';
import { Search, CalendarDays, Maximize2 } from 'lucide-react';

interface TaskChatViewProps {
  task: Task;
  onExpand?: () => void;
  isExpanded?: boolean;
}

export const TaskChatView: React.FC<TaskChatViewProps> = ({ task, onExpand, isExpanded = false }) => {
  const currentUser = useAuthStore((state) => state.user);
  const { members: projectMembers, fetchMembers: fetchProjectMembers } = useProjectMemberStore();
  const workspaceMembers = useWorkspaceStore((state) => state.members);

  const {
    messagesByTask,
    isLoadingByTask,
    isLoadingMoreByTask,
    hasMoreByTask,
    searchResults,
    isSearching,
    searchQuery,
    typingUsersByTask,
    fetchMessages,
    fetchOlderMessages,
    fetchMessagesAround,
    searchMessages,
    clearSearch,
    sendMessage,
    retrySendMessage,
    editMessage,
    deleteMessage,
    addOrUpdateRealtimeMessage,
    setTypingUser,
    removeTypingUser,
  } = useTaskChatStore();

  const messages = messagesByTask[task.id] || [];
  const isLoading = isLoadingByTask[task.id] || false;
  const isLoadingMore = isLoadingMoreByTask[task.id] || false;
  const hasMore = hasMoreByTask[task.id] || false;
  const typingMap = typingUsersByTask[task.id] || {};
  const typingNames = Object.values(typingMap);

  const [inputBody, setInputBody] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showNewMessagesBtn, setShowNewMessagesBtn] = useState(false);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Filter members for mention dropdown
  const mentionMembers = useMemo(() => {
    const allMembers = projectMembers.filter((m) => m && m.name != null);
    if (!mentionQuery) return allMembers;
    const q = mentionQuery.toLowerCase();
    return allMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [projectMembers, mentionQuery]);

  const messageListRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    fetchProjectMembers(task.projectId);
    fetchMessages(task.id);
  }, [task.id, task.projectId, fetchProjectMembers, fetchMessages]);

  // Real-time socket listeners
  useEffect(() => {
    if (!currentUser || !task.boardId) return;
    const socket = getSocket();

    const handleCreated = (msg: TaskChatMessage) => {
      if (msg.taskId === task.id && msg.userId !== currentUser.id) {
        addOrUpdateRealtimeMessage(task.id, msg);
        if (!isScrolledToBottomRef.current) {
          setShowNewMessagesBtn(true);
        }
      }
    };

    const handleUpdated = (msg: TaskChatMessage) => {
      if (msg.taskId === task.id) {
        addOrUpdateRealtimeMessage(task.id, msg);
      }
    };

    const handleDeleted = (msg: TaskChatMessage) => {
      if (msg.taskId === task.id) {
        addOrUpdateRealtimeMessage(task.id, msg);
      }
    };

    const handleTyping = (data: { taskId: string; userId: string; name: string }) => {
      if (data.taskId === task.id && data.userId !== currentUser.id) {
        setTypingUser(task.id, data.userId, data.name);
      }
    };

    const handleStopTyping = (data: { taskId: string; userId: string }) => {
      if (data.taskId === task.id) {
        removeTypingUser(task.id, data.userId);
      }
    };

    socket.on('chat:messageCreated', handleCreated);
    socket.on('chat:messageUpdated', handleUpdated);
    socket.on('chat:messageDeleted', handleDeleted);
    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);

    return () => {
      socket.off('chat:messageCreated', handleCreated);
      socket.off('chat:messageUpdated', handleUpdated);
      socket.off('chat:messageDeleted', handleDeleted);
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
    };
  }, [task.id, task.boardId, currentUser, addOrUpdateRealtimeMessage, setTypingUser, removeTypingUser]);

  // Auto scroll to bottom when initially loaded
  useEffect(() => {
    if (messages.length > 0 && isScrolledToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      setShowNewMessagesBtn(false);
    }
  };

  const handleScroll = async () => {
    if (!messageListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;

    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    isScrolledToBottomRef.current = isBottom;
    if (isBottom) setShowNewMessagesBtn(false);

    // Infinite scroll top load older cursor messages
    if (scrollTop < 30 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = scrollHeight;
      const countAdded = await fetchOlderMessages(task.id);
      if (countAdded > 0 && messageListRef.current) {
        const newScrollHeight = messageListRef.current.scrollHeight;
        messageListRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputBody.trim() || !currentUser) return;
    const text = inputBody.trim();
    setInputBody('');
    stopTypingImmediate();
    await sendMessage(task.id, text, currentUser);
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention dropdown keyboard navigation
    if (showMentionDropdown && mentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionMembers.length) % mentionMembers.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentionMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertMention = (member: { id: string; name: string }) => {
    const cursorPos = inputBody.length;
    const textBeforeCursor = inputBody.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, atMatch.index);
      const newText = beforeAt + '@' + member.name + ' ';
      setInputBody(newText);
    }
    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputBody(val);

    // Detect @mention trigger
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionDropdown(true);
      setMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }

    if (!currentUser || !task.boardId) return;
    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { boardId: task.boardId, taskId: task.id, name: currentUser.name });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingImmediate();
    }, 1500);
  };

  const stopTypingImmediate = () => {
    if (isTypingRef.current && currentUser && task.boardId) {
      const socket = getSocket();
      socket.emit('stopTyping', { boardId: task.boardId, taskId: task.id });
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchMessages(task.id, searchInput.trim());
    }
  };

  const handleJumpToSearchResult = async (msg: TaskChatMessage) => {
    setIsSearchOpen(false);
    clearSearch();
    await fetchMessagesAround(task.id, msg.createdAt as string);
    setHighlightedMsgId(msg.id);
    setTimeout(() => setHighlightedMsgId(null), 3000);
  };

  const handleJumpToDate = async (dateStr: string) => {
    if (!dateStr) return;
    setIsDatePickerOpen(false);
    await fetchMessagesAround(task.id, new Date(dateStr).toISOString());
  };

  const handleStartEdit = (msg: TaskChatMessage) => {
    setEditingMsgId(msg.id);
    setEditingText(msg.body);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await editMessage(task.id, msgId, editingText.trim());
      setEditingMsgId(null);
    } catch (err) {
      // Handled
    }
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(task.id, msgId);
    } catch (err) {
      // Handled
    }
  };

  // Group messages by Date headers
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; msgs: TaskChatMessage[] }[] = [];
    let currentLabel = '';
    let currentGroup: TaskChatMessage[] = [];

    messages.forEach((m) => {
      const d = new Date(m.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) dateLabel = 'Today';
      else if (d.toDateString() === yesterday.toDateString()) dateLabel = 'Yesterday';

      if (dateLabel !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentLabel, msgs: currentGroup });
        }
        currentLabel = dateLabel;
        currentGroup = [m];
      } else {
        currentGroup.push(m);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentLabel, msgs: currentGroup });
    }

    return groups;
  }, [messages]);

  const participantCount = projectMembers.length || workspaceMembers.length || 1;

  const renderBodyWithMentions = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_. -]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="font-bold text-primary bg-primary/10 px-1 rounded-xs">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-sm overflow-hidden font-sans relative">
      {/* Header */}
      <div className="bg-surface-hover border-b border-border p-3 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black uppercase text-text-primary tracking-wider">
              Task Chat
            </h3>
            <span className="text-[9px] font-mono text-text-muted bg-surface-active px-1.5 py-0.5 rounded-sm font-bold">
              {participantCount} participants
            </span>
          </div>
          {typingNames.length > 0 && (
            <span className="text-[9px] font-mono text-primary italic block mt-0.5 animate-pulse">
              {typingNames.join(', ')} typing...
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Icon Button */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setIsDatePickerOpen(false);
            }}
            title="Search Messages"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-active rounded-sm transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Jump to Date Button */}
          <button
            onClick={() => {
              setIsDatePickerOpen(!isDatePickerOpen);
              setIsSearchOpen(false);
            }}
            title="Jump to Date"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-active rounded-sm transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          {/* Expand Workspace Button */}
          {onExpand && !isExpanded && (
            <button
              onClick={onExpand}
              title="Expand Workspace Modal"
              className="text-[9px] font-mono font-bold uppercase tracking-wider bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded-sm transition-colors ml-1"
            >
              Expand Workspace ↗
            </button>
          )}
        </div>
      </div>

      {/* Search Popover Panel */}
      {isSearchOpen && (
        <div className="bg-surface-elevated border-b border-border p-3 space-y-3 shrink-0 shadow-md font-mono text-xs z-20">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="SEARCH MESSAGES BY KEYWORD OR SENDER..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-input border border-border py-1.5 px-3 rounded-sm text-text-primary focus:outline-none focus:border-primary uppercase text-xs"
              autoFocus
            />
            <button
              type="submit"
              className="bg-primary text-white px-3 py-1.5 rounded-sm font-bold uppercase"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                clearSearch();
              }}
              className="bg-surface-active text-text-muted px-2 py-1.5 rounded-sm uppercase"
            >
              X
            </button>
          </form>

          {isSearching && <div className="text-[10px] text-text-muted italic">Searching messages...</div>}

          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2 border-t border-border pt-2">
              <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                Found {searchResults.length} match(es):
              </span>
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleJumpToSearchResult(res)}
                  className="p-2 border border-border bg-surface-hover hover:border-primary cursor-pointer rounded-sm"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold text-text-primary">
                    <span>{res.user.name}</span>
                    <span className="text-text-muted text-[8px]">
                      {new Date(res.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">{res.body}</p>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-[10px] text-text-faint italic">No messages found matching "{searchQuery}".</div>
          )}
        </div>
      )}

      {/* Jump to Date Popover */}
      {isDatePickerOpen && (
        <div className="bg-surface-elevated border-b border-border p-3 space-y-2 shrink-0 shadow-md font-mono text-xs z-20 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-text-muted">Select Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              handleJumpToDate(e.target.value);
            }}
            className="bg-input border border-border py-1 px-2 text-text-primary text-xs rounded-sm focus:outline-none focus:border-primary uppercase"
          />
          <button
            onClick={() => setIsDatePickerOpen(false)}
            className="text-text-muted hover:text-text-primary px-2 font-bold"
          >
            X
          </button>
        </div>
      )}

      {/* Message List Area */}
      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoadingMore && (
          <div className="text-center py-2 text-[10px] font-mono text-text-muted uppercase tracking-widest italic">
            Loading older messages...
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-text-muted uppercase tracking-widest">
            Syncing task chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-sm p-6 space-y-2">
            <span className="text-2xl block">💬</span>
            <p className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
              No Chat Messages Yet
            </p>
            <p className="text-[11px] font-mono text-text-muted">
              Start the discussion for this task. All team members can collaborate in real time.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Date Separator Header */}
              <div className="flex items-center justify-center my-3">
                <div className="border-t border-border flex-1"></div>
                <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-text-muted px-3 py-0.5 bg-surface-active border border-border rounded-full">
                  ── {group.dateLabel} ──
                </span>
                <div className="border-t border-border flex-1"></div>
              </div>

              {group.msgs.map((msg) => {
                const isMe = msg.userId === currentUser?.id;
                const isEditing = editingMsgId === msg.id;
                const isHighlighted = highlightedMsgId === msg.id;
                const isFailed = msg.status === 'failed';
                const isSending = msg.status === 'sending';

                const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-2 group ${
                      isMe ? 'flex-row-reverse space-x-reverse' : ''
                    } ${isHighlighted ? 'ring-2 ring-primary p-1 rounded-sm bg-primary/5 transition-all' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-surface-active border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary font-mono shrink-0 select-none">
                      {msg.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`max-w-[75%] rounded-sm p-3 border font-sans text-xs space-y-1 ${
                        isMe
                          ? 'bg-primary text-white border-primary/40'
                          : 'bg-surface-hover text-text-primary border-border'
                      } ${isFailed ? 'border-danger bg-danger/10 text-danger' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[9px] font-mono border-b border-white/10 pb-1 mb-1">
                        <span className={`font-bold uppercase ${isMe ? 'text-white/90' : 'text-text-primary'}`}>
                          {msg.user.name} {isMe && '(You)'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`${isMe ? 'text-white/70' : 'text-text-muted'}`}>
                            {timeStr}
                          </span>
                          {msg.isEdited && !msg.isDeleted && (
                            <span className="italic text-[8px] opacity-75">(edited)</span>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 mt-1 font-mono">
                          <textarea
                            rows={2}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-input border border-border text-text-primary p-2 text-xs rounded-sm focus:outline-none"
                          />
                          <div className="flex space-x-2 text-[9px]">
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              className="bg-primary text-white px-2 py-1 rounded-sm font-bold uppercase"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMsgId(null)}
                              className="bg-surface-active text-text-muted px-2 py-1 rounded-sm uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={`leading-relaxed break-words whitespace-pre-wrap ${msg.isDeleted ? 'italic text-text-muted' : ''}`}>
                          {renderBodyWithMentions(msg.body)}
                        </p>
                      )}

                      {/* Footer Actions / Status */}
                      <div className="flex justify-between items-center pt-1 font-mono text-[9px]">
                        {isSending && (
                          <span className="text-[8px] italic opacity-80">Sending...</span>
                        )}
                        {isFailed && (
                          <div className="flex items-center space-x-2 text-danger font-bold">
                            <span>Sending failed</span>
                            <button
                              onClick={() => retrySendMessage(task.id, msg.id)}
                              className="underline font-mono uppercase"
                            >
                              [Retry]
                            </button>
                          </div>
                        )}

                        {isMe && !msg.isDeleted && !isEditing && !isSending && !isFailed && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 ml-auto">
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className={`${isMe ? 'text-white/80 hover:text-white' : 'text-text-muted hover:text-primary'} uppercase`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMsg(msg.id)}
                              className={`${isMe ? 'text-white/80 hover:text-white' : 'text-text-muted hover:text-danger'} uppercase`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Floating New Messages Indicator */}
      {showNewMessagesBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-16 right-6 bg-primary text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg border border-white/20 animate-bounce z-30"
        >
          New messages ↓
        </button>
      )}

      {/* Message Input Composer */}
      <div className="border-t border-border p-3 bg-surface-hover shrink-0 font-mono relative">
        {/* Mention Dropdown */}
        {showMentionDropdown && mentionMembers.length > 0 && (
          <div
            ref={mentionDropdownRef}
            className="absolute bottom-full left-3 right-3 mb-1 bg-surface-elevated border border-border rounded-sm shadow-theme-lg max-h-40 overflow-y-auto z-30"
          >
            {mentionMembers.slice(0, 8).map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m)}
                className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors ${
                  idx === mentionIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-primary hover:bg-surface-hover'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-surface-active border border-border flex items-center justify-center text-[8px] font-bold text-text-secondary shrink-0">
                  {m.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                <span className="font-bold">{m.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            value={inputBody}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="TYPE A MESSAGE... (@ to mention, ENTER to send)"
            className="flex-1 bg-input border-2 border-border focus:border-primary rounded-sm p-2.5 text-xs text-text-primary focus:outline-none placeholder-text-faint resize-none leading-relaxed"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputBody.trim()}
            className="bg-primary hover:bg-primary-hover disabled:bg-surface-active disabled:text-text-faint text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-sm transition-colors border border-transparent disabled:border-border shrink-0 h-10 flex items-center justify-center"
          >
            Send ➤
          </button>
        </div>
      </div>
    </div>
  );
};
