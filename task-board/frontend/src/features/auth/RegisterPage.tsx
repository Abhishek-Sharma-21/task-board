import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useAuthStore } from './authStore';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterInput } from '../../schemas';
import { Spinner } from '../../components/Spinner';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const form = useForm<z.infer<typeof RegisterInput>>({
    resolver: zodResolver(RegisterInput),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof RegisterInput>) => {
    try {
      await register(data.name, data.email, data.password);
      navigate('/');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        form.setError('email', { message: 'Email already in use' });
      } else {
        form.setError('root', { message: 'Something went wrong' });
      }
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
            START YOUR <br />
            <span className="text-primary">JOURNEY.</span>
          </h1>
          <p className="mt-6 text-text-muted text-sm max-w-sm font-medium leading-relaxed">
            Create a free account and start collaborating with your team in real time.
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
              GET STARTED
            </span>
            <h2 className="text-4xl font-black uppercase tracking-tight text-text-primary leading-none">
              CREATE ACCOUNT.
            </h2>
            <p className="mt-2 text-sm text-text-tertiary font-medium">
              Join Task Board to manage and sync tasks in real time.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs uppercase font-mono tracking-wider text-text-muted mb-2">
                Full Name *
              </label>
              <input
                id="name"
                {...form.register('name')}
                type="text"
                required
                className="block w-full bg-input border border-border rounded-sm py-3 px-4 text-text-primary placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-border-strong focus:border-border-strong text-sm"
                placeholder="John Doe"
              />
              {form.formState.errors.name && (
                <span className="mt-1.5 text-xs text-danger block">{form.formState.errors.name?.message}</span>
              )}
            </div>

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
                placeholder="Minimum 8 characters"
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
                <span>{isLoading ? 'Creating account...' : 'Sign up'}</span>
                {isLoading ? <Spinner /> : <span>&gt;</span>}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-text-muted font-mono">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-text-primary underline hover:text-text-secondary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export { RegisterPage };