import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from './authStore';
import { useNavigate, Link } from 'react-router-dom';
import { LoginInput } from '../../schemas';
import { Spinner } from '../../components/Spinner';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const form = useForm<z.infer<typeof LoginInput>>({
    resolver: zodResolver(LoginInput),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof LoginInput>) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (error) {
      form.setError('root', { message: 'Invalid email or password' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-page">
      {/* Left Panel: Dark Brand Showcase */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-6 sm:p-8 md:p-12 bg-sidebar text-text-primary border-b md:border-b-0 md:border-r border-border-subtle">
        {/* Brand Header */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary flex items-center justify-center rounded-sm font-bold text-sm text-white">
            T
          </div>
          <span className="text-sm font-black tracking-widest text-text-primary uppercase">
            Task Board
          </span>
        </div>

        {/* Hero Title */}
        <div className="my-auto py-12 md:py-0">
          <span className="text-xs uppercase font-mono tracking-widest text-text-muted block mb-4">
            COLLABORATION, SHARPENED
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none select-none">
            MOVE WORK <br />
            <span className="text-primary">FORWARD.</span>
          </h1>
          <p className="mt-6 text-text-muted text-sm max-w-sm font-medium leading-relaxed">
            One precise workspace for teams that build, review, and ship together.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono text-text-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-success inline-block animate-pulse"></span>
          <span>All systems operational</span>
          <span className="text-success uppercase">LIVE</span>
        </div>
      </div>

      {/* Right Panel: Form Input */}
      <div className="w-full md:w-1/2 flex flex-col justify-center bg-page p-6 sm:p-8 md:p-16">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-text-muted block mb-1">
              WELCOME BACK
            </span>
            <h2 className="text-4xl font-black uppercase tracking-tight text-text-primary leading-none">
              ENTER THE BOARD.
            </h2>
            <p className="mt-2 text-sm text-text-tertiary font-medium">
              Pick up exactly where your team left off.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs uppercase font-mono tracking-wider text-text-muted mb-2">
                Work email *
              </label>
              <input
                id="email"
                {...form.register('email')}
                type="email"
                required
                className="block w-full bg-input border border-border rounded-sm py-3 px-4 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-border-strong focus:border-border-strong text-sm"
                placeholder="you@company.com"
              />
              {form.formState.errors.email && (
                <span className="mt-1.5 text-xs text-danger block">{form.formState.errors.email?.message}</span>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase font-mono tracking-wider text-text-muted mb-2">
                Password *
              </label>
              <input
                id="password"
                {...form.register('password')}
                type="password"
                required
                className="block w-full bg-input border border-border rounded-sm py-3 px-4 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-border-strong focus:border-border-strong text-sm"
                placeholder="••••••••"
              />
              {form.formState.errors.password && (
                <span className="mt-1.5 text-xs text-danger block">{form.formState.errors.password?.message}</span>
              )}
            </div>

            {form.formState.errors.root && (
              <div className="text-xs font-mono text-danger bg-danger-light border border-danger/20 p-3 rounded-sm text-center">
                {form.formState.errors.root.message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-between items-center py-3.5 px-6 border border-transparent text-sm font-bold uppercase tracking-wider rounded-sm text-white bg-primary hover:bg-primary-hover disabled:opacity-70 focus:outline-none transition-colors"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
                {isLoading ? <Spinner /> : <span>&gt;</span>}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-text-muted font-mono">
            New to Task Board?{' '}
            <Link
              to="/register"
              className="font-bold text-text-primary underline hover:text-text-secondary"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export { LoginPage };