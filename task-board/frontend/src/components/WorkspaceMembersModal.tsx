import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useToastStore } from './common/toastStore';
import { useConfirmStore } from './common/confirmStore';
import { Spinner } from './Spinner';
import { Users, Mail, Link2, Trash2, Copy, Check, UserPlus, X } from 'lucide-react';

interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'members' | 'invite' | 'join';

export const WorkspaceMembersModal: React.FC<WorkspaceMembersModalProps> = ({ isOpen, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const {
    activeWorkspace,
    members,
    invites,
    fetchMembers,
    fetchInvites,
    inviteMember,
    createInviteLink,
    revokeInvite,
    changeMemberRole,
    removeMember,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (isOpen && activeWorkspace) {
      fetchMembers(activeWorkspace.id, true);
      fetchInvites(activeWorkspace.id);
    }
  }, [isOpen, activeWorkspace]);

  useEffect(() => {
    if (!isOpen) {
      setInviteEmail('');
      setInviteError(null);
      setInviteSuccess(false);
      setShareableLink(null);
      setCopiedLink(false);
      setActiveTab('members');
    }
  }, [isOpen]);

  if (!isOpen || !activeWorkspace) return null;

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await inviteMember(activeWorkspace.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to invite member';
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateLink = async () => {
    if (isCreatingLink) return;
    setIsCreatingLink(true);
    try {
      const invite = await createInviteLink(activeWorkspace.id);
      const link = `${window.location.origin}/join-workspace?token=${invite.token}`;
      setShareableLink(link);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create link';
      setInviteError(msg);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareableLink) return;
    await navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!activeWorkspace) return;
    try {
      await changeMemberRole(activeWorkspace.id, userId, role);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to change role';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspace || removingMemberId) return;
    const confirmed = await useConfirmStore.getState().open({
      title: 'Confirm',
      message: 'Are you sure you want to remove this member from the workspace?',
      confirmLabel: 'Confirm',
      variant: 'danger',
    });
    if (!confirmed) return;
    setRemovingMemberId(userId);
    try {
      await removeMember(activeWorkspace.id, userId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove member';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeWorkspace) return;
    const confirmed = await useConfirmStore.getState().open({
      title: 'Confirm',
      message: 'Revoke this invite?',
      confirmLabel: 'Confirm',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await revokeInvite(activeWorkspace.id, inviteId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to revoke invite';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'members', label: 'Members', icon: <Users className="w-3 h-3" /> },
    ...(canManage ? [
      { id: 'invite' as Tab, label: 'Invite', icon: <UserPlus className="w-3 h-3" /> },
      { id: 'join' as Tab, label: 'Share Link', icon: <Link2 className="w-3 h-3" /> },
    ] : []),
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated border border-border p-6 rounded-sm w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-1">
              WORKSPACE TEAM
            </span>
            <h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
              {activeWorkspace.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            <div className="space-y-2">
              {members.map((m: typeof members[0]) => {
                const isMe = m.id === user?.id;
                let canRemove = false;
                if (!isMe && m.role !== 'owner') {
                  if (userRole === 'owner') canRemove = true;
                  else if (userRole === 'admin' && m.role === 'member') canRemove = true;
                }

                return (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-border bg-surface-hover rounded-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-[10px] text-text-secondary">
                        {getInitials(m.name)}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-text-primary block font-sans">
                          {m.name} {isMe && <span className="text-[9px] text-primary font-mono font-normal">(YOU)</span>}
                        </span>
                        <span className="text-text-muted text-[10px] block font-mono">{m.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userRole === 'owner' && m.role !== 'owner' && !isMe ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as 'admin' | 'member')}
                          className="bg-input border border-border rounded-sm py-1 px-2 text-text-primary focus:outline-none focus:border-primary text-[10px] font-mono"
                        >
                          <option value="member">MEMBER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                          m.role === 'owner'
                            ? 'border-primary bg-primary/10 text-primary'
                            : m.role === 'admin'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-border text-text-muted'
                        }`}>
                          {m.role}
                        </span>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMemberId === m.id}
                          className="text-danger hover:text-danger-hover p-1 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && canManage && (
          <div className="space-y-4">
            <form onSubmit={handleInviteEmail} className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold block">
                Invite by Email
              </span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1 bg-input border border-border rounded-sm py-2 px-3 text-xs font-mono text-text-primary placeholder-text-faint focus:outline-none focus:border-primary"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="bg-input border border-border rounded-sm py-2 px-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="member">MEMBER</option>
                  <option value="admin">ADMIN</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
                >
                  {isInviting && <Spinner />}
                  <Mail className="w-3 h-3" />
                  {isInviting ? 'Sending...' : 'Invite'}
                </button>
              </div>
              {inviteError && <p className="text-xs text-danger font-mono">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-success font-mono">Member invited successfully!</p>}
            </form>
          </div>
        )}

        {/* Share Link Tab */}
        {activeTab === 'join' && canManage && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold block">
              Shareable Join Link
            </span>
            <p className="text-xs text-text-muted font-mono">
              Generate a link that anyone can use to join this workspace.
            </p>

            {!shareableLink ? (
              <button
                onClick={handleCreateLink}
                disabled={isCreatingLink}
                className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-sm transition-colors flex items-center gap-2 w-full justify-center"
              >
                {isCreatingLink && <Spinner />}
                <Link2 className="w-3 h-3" />
                {isCreatingLink ? 'Generating...' : 'Generate Join Link'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    className="flex-1 bg-input border border-border rounded-sm py-2 px-3 text-[11px] font-mono text-text-secondary"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-surface-hover border border-border hover:border-primary text-text-primary font-mono text-xs font-bold px-3 py-2 rounded-sm transition-colors flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[9px] text-text-muted font-mono">
                  This link expires in 7 days. Anyone with this link can join as a member.
                </p>
              </div>
            )}

            {inviteError && <p className="text-xs text-danger font-mono">{inviteError}</p>}
          </div>
        )}

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
              Pending Invites ({invites.length})
            </span>
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2 border border-border bg-surface-hover rounded-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="text-xs font-mono text-text-secondary truncate">
                    {inv.email || 'Shareable link'}
                  </span>
                  <span className="text-[9px] font-mono text-text-faint">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-danger hover:text-danger-hover p-1 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
