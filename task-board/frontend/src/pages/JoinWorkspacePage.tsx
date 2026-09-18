import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useAuthStore } from '../features/auth/authStore';
import { api } from '../api/client';
import { Spinner } from '../components/Spinner';
import { LogIn, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export const JoinWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const user = useAuthStore((state) => state.user);
  const { acceptInvite, fetchWorkspaces } = useWorkspaceStore();

  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await api.get<{ success: true; data: { workspaceName: string } }>(
          `/invites/validate?token=${token}`
        );
        setWorkspaceName(res.data.data.workspaceName);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired invite');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleJoin = async () => {
    if (!token || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      await acceptInvite(token);
      setSuccess(true);
      await fetchWorkspaces();
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join workspace');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 font-sans">
      <div className="bg-surface-elevated border border-border rounded-sm w-full max-w-md p-8 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </button>

        {/* Loading */}
        {isValidating && (
          <div className="text-center space-y-4 py-8">
            <Spinner className="mx-auto" />
            <p className="text-sm text-text-muted font-mono">Validating invite...</p>
          </div>
        )}

        {/* Error */}
        {error && !isValidating && (
          <div className="text-center space-y-4 py-8">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto" />
            <h2 className="text-lg font-black uppercase text-text-primary">Invite Invalid</h2>
            <p className="text-sm text-text-muted font-mono">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary-hover text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-lg font-black uppercase text-text-primary">Welcome!</h2>
            <p className="text-sm text-text-muted font-mono">
              You've joined <strong>{workspaceName}</strong>. Redirecting...
            </p>
          </div>
        )}

        {/* Ready to join */}
        {!isValidating && !error && !success && workspaceName && (
          <div className="space-y-6">
            <div className="text-center">
              <LogIn className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-black uppercase tracking-tight text-text-primary">
                Join Workspace
              </h2>
              <p className="mt-2 text-sm text-text-muted font-mono">
                You've been invited to join
              </p>
              <p className="text-lg font-black text-primary uppercase mt-1">
                {workspaceName}
              </p>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-xs text-text-muted font-mono text-center">
                  You need to be logged in to accept this invite.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-sm transition-colors"
                >
                  Log In to Accept
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-surface-hover border border-border hover:border-primary text-text-primary font-mono text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-sm transition-colors"
                >
                  Create Account
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                {isJoining && <Spinner />}
                {isJoining ? 'Joining...' : 'Accept & Join Workspace'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
