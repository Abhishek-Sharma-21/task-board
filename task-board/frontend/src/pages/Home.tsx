import { useAuthStore } from '../features/auth/authStore';
import { useWorkspaceStore } from '../features/workspaces/workspaceStore';
import { useOutletContext } from 'react-router-dom';

export const Home: React.FC = () => {
  const { setIsBoardModalOpen } = useOutletContext<{ setIsBoardModalOpen: (open: boolean) => void }>();
  const user = useAuthStore((state) => state.user);
  const { members } = useWorkspaceStore();
  const userMember = members.find((m) => m.id === user?.id);
  const userRole = userMember ? userMember.role : 'member';
  const userName = user?.name ? user.name.toUpperCase() : 'USER';

  const getCurrentDateFormatted = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    return `${dayName}, ${monthName} ${date} · SPRINT 04`;
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-text-muted block mb-2">
            {getCurrentDateFormatted()}
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-text-primary leading-none">
            GOOD MORNING, {userName}.
          </h1>
          <p className="mt-2 text-sm text-text-secondary font-medium">
            A clear view of what is moving, what is blocked, and what ships next.
          </p>
        </div>

        <div className="self-start md:self-center flex items-center space-x-2 bg-surface border border-border py-1.5 px-4 rounded-full text-xs font-mono text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse"></span>
          <span>Live collaboration ready</span>
        </div>
      </div>

      <div className="border border-dashed border-border bg-surface/40 rounded-sm p-12 text-center max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-12 h-12 bg-success-light border border-success/30 text-success flex items-center justify-center rounded-sm mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted block mb-2">
          PHASE 01 COMPLETE
        </span>
        <h2 className="text-2xl font-black uppercase tracking-tight text-text-primary">
          YOUR BOARD IS READY TO TAKE SHAPE.
        </h2>
        <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
          Authentication is connected. Columns, tasks, and live collaboration arrive in the next build phase.
        </p>

        {userRole !== 'member' && (
          <button
            onClick={() => setIsBoardModalOpen(true)}
            className="mt-8 flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-sm transition-colors shadow-lg"
          >
            <span>Create your first board</span>
            <span>&gt;</span>
          </button>
        )}
      </div>
    </div>
  );
};
